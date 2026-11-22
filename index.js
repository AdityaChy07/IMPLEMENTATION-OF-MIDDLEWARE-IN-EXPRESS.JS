const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. BUILT-IN MIDDLEWARE
// ==========================================
// Parses incoming requests with JSON payloads (Section 8)
app.use(express.json());
// Parses incoming requests with urlencoded payloads
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. TIMING MIDDLEWARE (Section 30)
// ==========================================
const timingMiddleware = function (req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const timeTaken = Date.now() - start;
        console.log(`[TIMING] ${req.method} ${req.url} took ${timeTaken} ms`);
    });
    next();
};
app.use(timingMiddleware);

// ==========================================
// 3. LOGGING MIDDLEWARE (Section 10 & 22)
// ==========================================
const loggingMiddleware = function (req, res, next) {
    console.log("-----------------------------");
    console.log("Logging Middleware");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("-----------------------------");
    next();
};
app.use(loggingMiddleware);

// ==========================================
// 4. AUTHENTICATION MIDDLEWARE (Section 11 & 22)
// ==========================================
const authenticationMiddleware = function (req, res, next) {
    console.log("Authentication Middleware");
    
    // Simulate unauthenticated request if requested
    if (req.query.unauthenticated === "true" || req.headers["x-unauthenticated"] === "true") {
        return res.status(401).json({
            success: false,
            message: "Not a valid User"
        });
    }

    // Role can be provided dynamically via query param (?role=admin) or header for testing,
    // defaulting to "student" as in the lab manual.
    const role = req.headers["x-user-role"] || req.query.role || "student";

    // Dummy user object
    req.user = {
        userId: 1,
        name: "Gaurav",
        role: role
    };

    if (req.user) {
        next();
    } else {
        return res.status(401).json({
            success: false,
            message: "Not a valid User"
        });
    }
};
app.use(authenticationMiddleware);

// ==========================================
// 5. VALIDATION MIDDLEWARE (Section 13 & 22)
// ==========================================
const validationMiddleware = function (req, res, next) {
    console.log("Validation Middleware");
    // Validate request body for POST/PUT requests
    if (req.method === "POST" || req.method === "PUT") {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is missing"
            });
        }
        if (!req.body.name) {
            return res.status(400).json({
                success: false,
                message: "Validation failed: 'name' is required"
            });
        }
    }
    next();
};

// ==========================================
// 6. STUDENT AUTHORIZATION (Section 19 & 22)
// ==========================================
const isStudent = function (req, res, next) {
    console.log("Student Authorization Middleware");
    if (req.user && req.user.role === "student") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access Denied, this route is only for students"
        });
    }
};

// ==========================================
// 7. ADMIN AUTHORIZATION (Section 20 & 22)
// ==========================================
const isAdmin = function (req, res, next) {
    console.log("Admin Authorization Middleware");
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied: this route is only for admins"
        });
    }
};

// ==========================================
// 8. HOME ROUTE (Section 22)
// ==========================================
app.get("/", validationMiddleware, (req, res) => {
    console.log("Home Route");
    res.send("Hello World!");
});

// ==========================================
// 9. STUDENT ROUTE (Section 21 & 22)
// ==========================================
app.get(
    "/student",
    isStudent,
    (req, res) => {
        console.log("Student Route");
        res.send("Student specific page");
    }
);

// ==========================================
// 10. ADMIN ROUTE (Section 21 & 22)
// ==========================================
app.get(
    "/admin",
    isAdmin,
    (req, res) => {
        console.log("Admin Route");
        res.send("Admin specific page");
    }
);

// ==========================================
// 11. POST ROUTE (Section 22 & 25)
// ==========================================
app.post(
    "/user",
    validationMiddleware,
    (req, res) => {
        console.log("POST request received");
        console.log("Request Body:", req.body);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: req.body
        });
    }
);

// ==========================================
// 12. ROUTE & QUERY PARAMETERS DEMO (Section 29)
// ==========================================
app.get("/user/:id", (req, res) => {
    res.json({
        success: true,
        message: "Route parameter accessed",
        id: req.params.id
    });
});

app.get("/search", (req, res) => {
    res.json({
        success: true,
        message: "Query parameter accessed",
        query: req.query
    });
});

// Route to trigger server error for error-handling middleware testing
app.get("/trigger-error", (req, res, next) => {
    next(new Error("Test server error"));
});

// ==========================================
// 13. 404 MIDDLEWARE (Section 22 & 26)
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// ==========================================
// 14. ERROR HANDLING MIDDLEWARE (Section 22)
// ==========================================
app.use((err, req, res, next) => {
    console.error("Error handler caught:", err.message);
    res.status(500).json({
        success: false,
        message: "Something went wrong on the server"
    });
});

// ==========================================
// 15. SERVER INITIALIZATION
// ==========================================
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
}

module.exports = app;
