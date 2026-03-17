import { redactPII } from './packages/types/src/observability';

const testData = {
    user: "John",
    email: "john@example.com",
    details: {
        password: "supersecret",
        apiKey: "12345-abcde",
        publicId: 123
    },
    history: [
        { token: "abc", action: "login" }
    ]
};

console.log("Original:");
console.log(JSON.stringify(testData, null, 2));
console.log("\nRedacted:");
console.log(JSON.stringify(redactPII(testData), null, 2));
