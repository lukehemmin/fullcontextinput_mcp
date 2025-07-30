#!/usr/bin/env node

// 새로운 쓰기 도구들 테스트
import { promises as fs } from 'fs';

console.log('🚀 fullcontextinput_mcp 쓰기 도구 테스트 시작');

// 테스트용 데이터
const testData = {
  shortCode: `// 짧은 테스트 코드
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`,

  diffOriginal: `// 원본 파일
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

console.log('Calculator ready');`,

  diffNew: `function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}`
};

async function testWriteTools() {
  console.log('\n📝 테스트 파일들 준비 중...');
  
  // 테스트 디렉토리 생성
  await fs.mkdir('./test_output', { recursive: true });
  
  console.log('✅ 테스트 준비 완료!');
  console.log('\n📖 MCP 클라이언트에서 다음 명령들을 테스트해보세요:');
  
  console.log('\n1️⃣ write_file_complete 테스트:');
  console.log('   파일 경로: ./test_output/short_code.js');
  console.log('   내용: (위의 shortCode 사용)');
  
  console.log('\n2️⃣ write_file_diff 테스트:');
  console.log('   1. 먼저 원본 파일 생성');
  console.log('   2. 2-4줄을 새로운 함수들로 교체');
  
  console.log('\n🎯 예상 결과:');
  console.log('   - 자동 백업 생성');
  console.log('   - 디렉토리 자동 생성');
  console.log('   - 상세한 수정 정보 제공');
  console.log('   - 캐시 자동 무효화');
}

testWriteTools().catch(console.error);
