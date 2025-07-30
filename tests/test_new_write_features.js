#!/usr/bin/env node

// 새로운 쓰기 기능 테스트 스크립트
import { promises as fs } from 'fs';
import path from 'path';

console.log('🎯 fullcontextinput_mcp v1.1.0 쓰기 기능 테스트');
console.log('새로 추가된 기능: write_file_complete, write_file_diff');

async function setupTestEnvironment() {
  console.log('\n📁 테스트 환경 설정...');
  
  // 테스트 디렉토리 생성
  const testDir = './test_output';
  await fs.mkdir(testDir, { recursive: true });
  
  // 원본 파일 생성 (diff 테스트용)
  const originalCode = `// 원본 Calculator 코드
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// 기본 테스트
console.log('Calculator loaded');
console.log('Add test:', add(5, 3));
console.log('Subtract test:', subtract(10, 4));`;

  await fs.writeFile(path.join(testDir, 'original_calc.js'), originalCode);
  
  console.log('✅ 테스트 환경 준비 완료');
  console.log('   - test_output/ 디렉토리 생성');
  console.log('   - original_calc.js 원본 파일 생성');
}

async function displayTestInstructions() {
  console.log('\n🚀 MCP 클라이언트에서 테스트하기:');
  console.log('\n=== 1. write_file_complete 테스트 ===');
  console.log('파라미터:');
  console.log(`  file_path: "./test_output/new_project.js"`);
  console.log('  content: (아래 코드 복사)');
  console.log(`
// 새 프로젝트 파일 - write_file_complete로 생성
class TaskManager {
  constructor() {
    this.tasks = [];
  }
  
  addTask(task) {
    this.tasks.push({
      id: Date.now(),
      content: task,
      completed: false
    });
  }
  
  completeTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) task.completed = true;
  }
  
  listTasks() {
    return this.tasks;
  }
}

// 사용 예시
const manager = new TaskManager();
manager.addTask('fullcontextinput_mcp 테스트');
manager.addTask('write_file_complete 확인');
console.log(manager.listTasks());
`);

  console.log('\n=== 2. write_file_diff 테스트 ===');
  console.log('파라미터:');
  console.log(`  file_path: "./test_output/original_calc.js"`);
  console.log(`  start_line: 2`);
  console.log(`  end_line: 7`);
  console.log('  new_content: (아래 코드로 교체)');
  console.log(`
function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) throw new Error('Cannot divide by zero');
  return a / b;
}

function power(base, exponent) {
  return Math.pow(base, exponent);
}
`);
  console.log(`  backup: true`);

  console.log('\n🎯 예상 결과:');
  console.log('1. write_file_complete:');
  console.log('   - 새 파일 생성');
  console.log('   - 파일 크기/라인 수 정보 표시');
  console.log('   - 작성 완료 메시지');
  
  console.log('\n2. write_file_diff:');
  console.log('   - 원본 자동 백업');
  console.log('   - 2-7줄 → 새로운 함수들로 교체');
  console.log('   - 라인 수 변경 통계 표시');
  console.log('   - 수정된 내용 미리보기');
  
  console.log('\n💡 특징:');
  console.log('   ✅ 디렉토리 자동 생성');
  console.log('   ✅ 자동 백업 (타임스탬프)');
  console.log('   ✅ Rate Limiting 적용');
  console.log('   ✅ 캐시 자동 무효화');
  console.log('   ✅ 상세한 수정 정보 제공');
}

async function main() {
  await setupTestEnvironment();
  await displayTestInstructions();
  
  console.log('\n🏁 테스트 준비 완료!');
  console.log('   MCP 클라이언트(Windsurf, Claude, Cursor)에서');
  console.log('   위의 명령들을 실행해보세요.');
}

main().catch(console.error);
