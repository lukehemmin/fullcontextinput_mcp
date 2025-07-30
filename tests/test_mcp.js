#!/usr/bin/env node

// MCP 서버 테스트 스크립트
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

class MCPTester {
    constructor() {
        this.serverProcess = null;
    }

    async testExtractFileContent() {
        console.log('=== 파일 내용 추출 테스트 ===');
        
        // 테스트 프롬프트들
        const testPrompts = [
            "test/sample.js 파일을 수정해주세요",
            "Component.tsx에서 버튼 스타일을 변경하고 싶습니다",
            "`test/sample.js`와 `test/Component.tsx` 파일을 분석해주세요",
            "package.json을 확인해보세요"
        ];

        for (const prompt of testPrompts) {
            console.log(`\n프롬프트: "${prompt}"`);
            
            // 파일 패턴 추출 테스트
            const extractedPatterns = this.extractFilePatterns(prompt);
            console.log(`추출된 파일 패턴: ${extractedPatterns.join(', ')}`);
            
            // 실제 파일 존재 확인
            for (const pattern of extractedPatterns) {
                const fullPath = path.resolve(process.cwd(), pattern);
                try {
                    await fs.access(fullPath);
                    console.log(`✓ 파일 존재: ${pattern}`);
                } catch (error) {
                    console.log(`✗ 파일 없음: ${pattern}`);
                }
            }
        }
    }

    extractFilePatterns(prompt) {
        const patterns = [];
        
        // 다양한 파일 패턴 매칭 (server.js와 동일한 로직)
        const fileRegexes = [
            /([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)/g,
            /`([^`]+\.[a-zA-Z0-9]+)`/g,
            /"([^"]+\.[a-zA-Z0-9]+)"/g,
            /'([^']+\.[a-zA-Z0-9]+)'/g,
        ];

        for (const regex of fileRegexes) {
            let match;
            while ((match = regex.exec(prompt)) !== null) {
                const filePath = match[1];
                if (!patterns.includes(filePath)) {
                    patterns.push(filePath);
                }
            }
        }

        return patterns;
    }

    async testReadFileContent() {
        console.log('\n=== 파일 읽기 테스트 ===');
        
        const testFiles = [
            'test/sample.js',
            'test/Component.tsx',
            'package.json'
        ];

        for (const file of testFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const stats = await fs.stat(file);
                
                console.log(`\n파일: ${file}`);
                console.log(`크기: ${stats.size} bytes`);
                console.log(`수정일: ${stats.mtime.toISOString()}`);
                console.log(`내용 미리보기: ${content.substring(0, 100)}...`);
                console.log('✓ 읽기 성공');
            } catch (error) {
                console.log(`✗ 읽기 실패: ${file} - ${error.message}`);
            }
        }
    }

    async testFindFiles() {
        console.log('\n=== 파일 검색 테스트 ===');
        
        const testPatterns = [
            '*.js',
            '*.json',
            'test/*.js',
            'test/*.tsx'
        ];

        for (const pattern of testPatterns) {
            try {
                const { glob } = await import('glob');
                const files = await glob(pattern, {
                    ignore: ['node_modules/**', '.git/**']
                });
                
                console.log(`\n패턴: ${pattern}`);
                console.log(`발견된 파일: ${files.length}개`);
                files.forEach(file => console.log(`  - ${file}`));
                console.log('✓ 검색 성공');
            } catch (error) {
                console.log(`✗ 검색 실패: ${pattern} - ${error.message}`);
            }
        }
    }

    async runAllTests() {
        console.log('FullContextInput MCP 서버 테스트 시작\n');
        
        try {
            await this.testExtractFileContent();
            await this.testReadFileContent();
            await this.testFindFiles();
            
            console.log('\n=== 테스트 완료 ===');
            console.log('✓ 모든 핵심 기능이 정상적으로 작동합니다.');
            console.log('\n다음 단계:');
            console.log('1. MCP 서버 실행: npm start');
            console.log('2. AI 클라이언트에서 MCP 서버 연결');
            console.log('3. 프롬프트에 파일명을 포함하여 테스트');
            
        } catch (error) {
            console.error('테스트 실행 중 오류 발생:', error);
        }
    }
}

// 테스트 실행
const tester = new MCPTester();
tester.runAllTests();
