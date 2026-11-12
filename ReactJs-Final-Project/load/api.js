// k6 load test, run inside the cluster with `kubectl run` (see README).
// To drive the autoscaler, point IDENTITY_URL / APPOINTMENTS_URL at the in-cluster services instead,
// since the gateway's per-IP rate limit caps a single load generator (see README).
import http from 'k6/http';
import {check, sleep} from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const IDENTITY = __ENV.IDENTITY_URL || BASE;
const APPOINTMENTS = __ENV.APPOINTMENTS_URL || BASE;

export const options = {
    stages: [
        {duration: '15s', target: 20},
        {duration: __ENV.HOLD || '45s', target: Number(__ENV.VUS || 50)},
        {duration: '10s', target: 0},
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'], // 200 and 429 count as expected, see below
        'http_req_duration{expected_response:true}': ['p(95)<300'],
        checks: ['rate>0.99'],
    },
};

// 429 is the rate limiter doing its job (all VUs share one IP); anything else is a failure.
http.setResponseCallback(http.expectedStatuses(200, 429));

export function setup() {
    const res = http.post(`${IDENTITY}/api/auth/login`, JSON.stringify({email: __ENV.ADMIN_EMAIL, password: __ENV.ADMIN_PASSWORD}), {
        headers: {'Content-Type': 'application/json'},
    });
    if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.body}`);
    return {headers: {Authorization: `Bearer ${res.json('accessToken')}`}};
}

export default function ({headers}) {
    const doctors = http.get(`${IDENTITY}/api/doctors`, {headers, tags: {name: 'doctors (cached)'}});
    check(doctors, {'doctors 200/429': (r) => r.status === 200 || r.status === 429});

    const appts = http.get(`${APPOINTMENTS}/api/appointments`, {headers, tags: {name: 'appointments (mongo)'}});
    check(appts, {'appointments 200/429': (r) => r.status === 200 || r.status === 429});

    sleep(0.5);
}
