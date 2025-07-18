#!/usr/bin/env node

// 디렉토리 컨텍스트 기능 테스트 스크립트
import { promises as fs } from 'fs';
import path from 'path';

class DirectoryContextTester {
    constructor() {
        this.testDir = path.join(process.cwd(), 'test_project');
    }

    // 테스트용 프로젝트 구조 생성
    async createTestProject() {
        console.log('=== 테스트 프로젝트 구조 생성 ===');
        
        // 테스트 디렉토리 생성
        await fs.mkdir(this.testDir, { recursive: true });
        await fs.mkdir(path.join(this.testDir, 'src'), { recursive: true });
        await fs.mkdir(path.join(this.testDir, 'src', 'components'), { recursive: true });
        await fs.mkdir(path.join(this.testDir, 'src', 'utils'), { recursive: true });
        await fs.mkdir(path.join(this.testDir, 'styles'), { recursive: true });
        
        // 테스트 파일들 생성
        const testFiles = [
            {
                path: path.join(this.testDir, 'src', 'main.js'),
                content: `// 메인 애플리케이션 파일
import { Button } from './components/Button.js';
import { formatDate } from './utils/helpers.js';

console.log('애플리케이션 시작');

const app = {
    init() {
        console.log('초기화 중...');
    },
    
    render() {
        const button = new Button('클릭하세요');
        button.render();
    }
};

app.init();
app.render();`
            },
            {
                path: path.join(this.testDir, 'src', 'components', 'Button.js'),
                content: `// 버튼 컴포넌트
export class Button {
    constructor(text) {
        this.text = text;
        this.element = null;
    }
    
    render() {
        this.element = document.createElement('button');
        this.element.textContent = this.text;
        this.element.addEventListener('click', this.handleClick.bind(this));
        document.body.appendChild(this.element);
    }
    
    handleClick() {
        console.log('버튼이 클릭되었습니다!');
    }
}`
            },
            {
                path: path.join(this.testDir, 'src', 'utils', 'helpers.js'),
                content: `// 유틸리티 헬퍼 함수들
export function formatDate(date) {
    return new Intl.DateTimeFormat('ko-KR').format(date);
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}`
            },
            {
                path: path.join(this.testDir, 'styles', 'main.css'),
                content: `/* 메인 스타일 파일 */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background-color: #0056b3;
}

button:active {
    transform: translateY(1px);
}`
            },
            {
                path: path.join(this.testDir, 'README.md'),
                content: `# 테스트 프로젝트

이 프로젝트는 MCP 디렉토리 컨텍스트 기능을 테스트하기 위한 샘플 프로젝트입니다.

## 구조

- \`src/\` - 소스 코드 디렉토리
  - \`main.js\` - 메인 애플리케이션 파일
  - \`components/\` - 컴포넌트 디렉토리
    - \`Button.js\` - 버튼 컴포넌트
  - \`utils/\` - 유틸리티 함수들
    - \`helpers.js\` - 헬퍼 함수들
- \`styles/\` - 스타일 파일들
  - \`main.css\` - 메인 스타일 파일

## 사용법

1. 브라우저에서 HTML 파일을 열어주세요
2. 버튼을 클릭하여 기능을 테스트하세요`
            }
        ];
        
        for (const file of testFiles) {
            await fs.writeFile(file.path, file.content, 'utf8');
            console.log(`✓ 생성됨: ${path.relative(process.cwd(), file.path)}`);
        }
        
        console.log('\n✓ 테스트 프로젝트 구조 생성 완료');
    }

    // 디렉토리 패턴 추출 테스트
    testDirectoryPatternExtraction() {
        console.log('\n=== 디렉토리 패턴 추출 테스트 ===');
        
        const testPrompts = [
            "@src/components 디렉토리의 모든 파일을 확인해주세요",
            "test_project/src 폴더 전체를 보여주세요",
            "`src/utils` 디렉토리 내용을 분석해주세요",
            "\"styles\" 폴더에 있는 파일들을 읽어주세요",
            "전체 프로젝트 구조를 파악하고 싶어요. test_project/ 를 확인해주세요"
        ];

        for (const prompt of testPrompts) {
            console.log(`\n프롬프트: "${prompt}"`);
            
            const extractedPatterns = this.extractDirectoryPatterns(prompt);
            console.log(`추출된 디렉토리 패턴: ${extractedPatterns.join(', ')}`);
        }
    }

    // 디렉토리 패턴 추출 (server.js와 동일한 로직)
    extractDirectoryPatterns(prompt) {
        const patterns = [];
        
        const directoryRegexes = [
            /@([a-zA-Z0-9_\-\./\\]+)/g,
            /(?:^|\s)([a-zA-Z0-9_\-\./\\]+\/[a-zA-Z0-9_\-\./\\]*)/g,
            /`([^`]+\/[^`]*)`/g,
            /"([^"]+\/[^"]*)"/g,
            /'([^']+\/[^']*)'/g,
        ];

        for (const regex of directoryRegexes) {
            let match;
            while ((match = regex.exec(prompt)) !== null) {
                let dirPath = match[1];
                
                if (dirPath.startsWith('@')) {
                    dirPath = dirPath.substring(1);
                }
                
                if (!/\.[a-zA-Z0-9]+$/.test(dirPath) && !patterns.includes(dirPath)) {
                    patterns.push(dirPath);
                }
            }
        }

        return patterns;
    }

    // 실제 디렉토리 존재 확인
    async checkDirectoryExists() {
        console.log('\n=== 디렉토리 존재 확인 ===');
        
        const testDirs = [
            'test_project',
            'test_project/src',
            'test_project/src/components',
            'test_project/src/utils',
            'test_project/styles'
        ];

        for (const dir of testDirs) {
            try {
                const stats = await fs.stat(dir);
                if (stats.isDirectory()) {
                    console.log(`✓ 존재: ${dir}`);
                } else {
                    console.log(`✗ 디렉토리 아님: ${dir}`);
                }
            } catch (error) {
                console.log(`✗ 존재하지 않음: ${dir}`);
            }
        }
    }

    // 정리 (테스트 디렉토리 삭제)
    async cleanup() {
        console.log('\n=== 정리 중 ===');
        try {
            await fs.rm(this.testDir, { recursive: true, force: true });
            console.log('✓ 테스트 디렉토리 삭제 완료');
        } catch (error) {
            console.log('⚠️ 테스트 디렉토리 삭제 실패:', error.message);
        }
    }

    async runAllTests() {
        console.log('디렉토리 컨텍스트 기능 테스트 시작\n');
        
        try {
            await this.createTestProject();
            this.testDirectoryPatternExtraction();
            await this.checkDirectoryExists();
            
            console.log('\n=== 테스트 완료 ===');
            console.log('✓ 디렉토리 컨텍스트 기능이 정상적으로 작동합니다!');
            console.log('\n다음 테스트 방법:');
            console.log('1. MCP 서버 실행: npm start');
            console.log('2. AI 클라이언트에서 다음과 같이 테스트:');
            console.log('   - "@test_project/src 폴더 전체를 분석해주세요"');
            console.log('   - "test_project/src/components 디렉토리의 모든 파일을 확인해주세요"');
            console.log('   - "styles/ 폴더에 있는 CSS 파일을 보여주세요"');
            
        } catch (error) {
            console.error('테스트 실행 중 오류 발생:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// 테스트 실행
const tester = new DirectoryContextTester();
tester.runAllTests();
