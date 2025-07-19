// 중간 크기 테스트 파일 (중간 모드 테스트용)
// 이 파일은 10KB~20KB 사이로 전체 제공 + 완독 마커 테스트용

function generateTestCode() {
    const functions = [];
    
    for (let i = 1; i <= 100; i++) {
        functions.push(`
function testFunction${i}() {
    console.log("This is test function number ${i}");
    const data = {
        id: ${i},
        name: "Test Function ${i}",
        description: "This is a test function for demonstrating medium file reading",
        timestamp: new Date().toISOString(),
        randomValue: Math.random() * 1000
    };
    
    return data;
}

function processData${i}(input) {
    if (!input) {
        throw new Error("Input is required for processData${i}");
    }
    
    const result = {
        processed: true,
        originalInput: input,
        functionNumber: ${i},
        processedAt: new Date(),
        hash: input.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0)
    };
    
    console.log(\`Processed data in function ${i}:\`, result);
    return result;
}
        `);
    }
    
    return functions.join('\n');
}

// Generate test code
const testCode = generateTestCode();
console.log("Generated", testCode.length, "characters of test code");

// Export all functions
module.exports = {
    generateTestCode,
    testCode
};
