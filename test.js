const http = require("http");
const app = require("./index");

const PORT = 3001; // Run test on a dedicated port
let server;

function makeRequest({ method = "GET", path = "/", headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const requestHeaders = { ...headers };
        if (payload) {
            requestHeaders["Content-Type"] = "application/json";
            requestHeaders["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(
            {
                hostname: "127.0.0.1",
                port: PORT,
                path,
                method,
                headers: requestHeaders,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsedData;
                    try {
                        parsedData = JSON.parse(data);
                    } catch {
                        parsedData = data;
                    }
                    resolve({ status: res.statusCode, headers: res.headers, body: parsedData });
                });
            }
        );

        req.on("error", (err) => reject(err));
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("   RUNNING EXPRESS MIDDLEWARE PRACTICAL TESTS     ");
    console.log("==================================================\n");

    server = app.listen(PORT);

    let passed = 0;
    let failed = 0;

    async function assertTest(name, fn) {
        try {
            await fn();
            console.log(`[PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`[FAIL] ${name}: ${err.message}`);
            failed++;
        }
    }

    try {
        // Test 1: Home Route
        await assertTest("Test 1: GET / (Home Route - Status 200 & 'Hello World!')", async () => {
            const res = await makeRequest({ path: "/" });
            if (res.status !== 200 || res.body !== "Hello World!") {
                throw new Error(`Expected 200 'Hello World!', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 2: Student Route as Student
        await assertTest("Test 2: GET /student (Student Role - Status 200 & 'Student specific page')", async () => {
            const res = await makeRequest({ path: "/student" });
            if (res.status !== 200 || res.body !== "Student specific page") {
                throw new Error(`Expected 200 'Student specific page', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 3: Admin Route as Student
        await assertTest("Test 3: GET /admin (Student Role - Status 403 Forbidden)", async () => {
            const res = await makeRequest({ path: "/admin" });
            if (res.status !== 403 || res.body.message !== "Access denied: this route is only for admins") {
                throw new Error(`Expected 403 Forbidden, got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 4: Admin Route as Admin
        await assertTest("Test 4: GET /admin (Admin Role - Status 200 & 'Admin specific page')", async () => {
            const res = await makeRequest({ path: "/admin?role=admin" });
            if (res.status !== 200 || res.body !== "Admin specific page") {
                throw new Error(`Expected 200 'Admin specific page', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 5: Student Route as Admin
        await assertTest("Test 5: GET /student (Admin Role - Status 403 Forbidden)", async () => {
            const res = await makeRequest({ path: "/student?role=admin" });
            if (res.status !== 403 || res.body.message !== "Access Denied, this route is only for students") {
                throw new Error(`Expected 403 Forbidden, got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 6: POST /user with valid data
        await assertTest("Test 6: POST /user (Valid Body - Status 201 Created)", async () => {
            const payload = {
                name: "Gaurav",
                email: "gaurav@example.com",
                course: "MBA",
            };
            const res = await makeRequest({ method: "POST", path: "/user", body: payload });
            if (res.status !== 201 || !res.body.success || res.body.data.name !== "Gaurav") {
                throw new Error(`Expected 201 Created with data, got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 7: POST /user without body
        await assertTest("Test 7: POST /user (Missing Body - Status 400 Bad Request)", async () => {
            const res = await makeRequest({ method: "POST", path: "/user", body: {} });
            if (res.status !== 400 || res.body.message !== "Request body is missing") {
                throw new Error(`Expected 400 Bad Request, got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 8: URL Parameter Demo (/user/:id)
        await assertTest("Test 8: GET /user/101 (Route Parameter - Status 200 & id: '101')", async () => {
            const res = await makeRequest({ path: "/user/101" });
            if (res.status !== 200 || res.body.id !== "101") {
                throw new Error(`Expected id '101', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 9: Query Parameter Demo (/search?id=101)
        await assertTest("Test 9: GET /search?id=101 (Query Parameter - Status 200 & query.id: '101')", async () => {
            const res = await makeRequest({ path: "/search?id=101" });
            if (res.status !== 200 || res.body.query.id !== "101") {
                throw new Error(`Expected query.id '101', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 10: 404 Route Not Found
        await assertTest("Test 10: GET /anything (Unknown Route - Status 404 Not Found)", async () => {
            const res = await makeRequest({ path: "/anything" });
            if (res.status !== 404 || res.body.message !== "Route not found") {
                throw new Error(`Expected 404 'Route not found', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 11: Error-Handling Middleware
        await assertTest("Test 11: GET /trigger-error (Error Middleware - Status 500)", async () => {
            const res = await makeRequest({ path: "/trigger-error" });
            if (res.status !== 500 || res.body.message !== "Something went wrong on the server") {
                throw new Error(`Expected 500 Server Error, got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

        // Test 12: Unauthenticated simulation
        await assertTest("Test 12: GET /?unauthenticated=true (Authentication Failure - Status 401)", async () => {
            const res = await makeRequest({ path: "/?unauthenticated=true" });
            if (res.status !== 401 || res.body.message !== "Not a valid User") {
                throw new Error(`Expected 401 'Not a valid User', got ${res.status} ${JSON.stringify(res.body)}`);
            }
        });

    } finally {
        server.close();
    }

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
