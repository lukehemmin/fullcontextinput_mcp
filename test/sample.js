// 샘플 JavaScript 파일
function calculateSum(a, b) {
    return a + b;
}

function calculateProduct(a, b) {
    return a * b;
}

class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = calculateSum(a, b);
        this.history.push(`${a} + ${b} = ${result}`);
        return result;
    }
    
    multiply(a, b) {
        const result = calculateProduct(a, b);
        this.history.push(`${a} * ${b} = ${result}`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
}

module.exports = { Calculator, calculateSum, calculateProduct };
