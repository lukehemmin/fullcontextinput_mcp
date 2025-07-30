# 🚀 FullContextInput MCP v1.1.0

[![NPM Version](https://img.shields.io/npm/v/fullcontextinput_mcp.svg)](https://www.npmjs.com/package/fullcontextinput_mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/fullcontextinput_mcp.svg)](https://www.npmjs.com/package/fullcontextinput_mcp)

**혁신적인 MCP 서버** - AI 코딩 툴(Claude, Cursor, Windsurf, VSCode Copilot 등)에서 **디렉토리 전체 컨텍스트 읽기**와 **스마트 코드 작성**을 모두 제공하는 완전한 개발 도구입니다.

## ✨ 주요 기능

### 📖 코드 읽기 기능
- 🔍 **스마트 파일명 추출**: 프롬프트에서 파일명을 자동으로 인식
- 📁 **디렉토리 컨텍스트**: `@src/components` 또는 `프로젝트/백엔드/` 입력 시 해당 디렉토리의 **모든 코드 파일**을 재귀적으로 읽기
- 🧩 **지능형 파일 읽기**: 파일 크기에 따라 자동으로 청킹, 컨텍스트 초과 방지
- 🔄 **재귀적 탐색**: 하위 디렉토리까지 완전 탐색
- 📊 **메타데이터 제공**: 파일 크기, 라인 수, 수정일 등 상세 정보

### ✍️ 코드 작성 기능 (NEW! v1.1.0)
- 📝 **스마트 파일 작성**: 짧은 코드(5000-6000토큰 미만)는 전체 파일 교체
- 🔧 **Diff 방식 수정**: 긴 코드(6000토큰 초과)는 라인 범위 지정으로 정확한 부분 수정
- 🛡️ **자동 백업**: 모든 수정 시 타임스탬프 기반 백업 파일 생성
- 📁 **디렉토리 자동 생성**: 필요한 경우 상위 디렉토리까지 자동 생성
- 📈 **상세한 수정 정보**: 변경 통계, 미리보기, 라인 수 변화 등 제공

### 🎯 시스템 특징
- 🌍 **크로스 플랫폼**: Windows, macOS, Linux 지원
- ⚡ **고성능**: Rate Limiting, 캐싱, 최적화된 파일 읽기
- 🔒 **안전성**: 에러 처리, 백업 시스템, 캐시 무효화
- 🎯 **AI 툴 완벽 지원**: Claude, Cursor, Windsurf, VSCode Copilot 등

## 📦 설치 방법

### 방법 1: NPM 글로벌 설치 (권장)
```bash
npm install -g fullcontextinput_mcp
```

### 방법 2: 로컬 개발 설치
```bash
# 저장소 클론
git clone https://github.com/yourusername/fullcontextinput_mcp.git
cd fullcontextinput_mcp

# 의존성 설치
npm install

# 전역 설치
npm install -g .
```

### 설치 확인
```bash
fullcontextinput-mcp --help
```

## 🔧 AI 툴 설정

### Claude Desktop
**설정 파일**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) 또는 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "fullcontextinput_mcp": {
      "command": "fullcontextinput-mcp",
      "args": []
    }
  }
}
```

### Cursor
**설정 파일**: `%APPDATA%\Cursor\User\settings.json` (Windows) 또는 `~/Library/Application Support/Cursor/User/settings.json` (macOS)

```json
{
  "mcp": {
    "servers": {
      "fullcontextinput_mcp": {
        "command": "fullcontextinput-mcp",
        "args": []
      }
    }
  }
}
```

### Windsurf
**설정 파일**: `%APPDATA%\Windsurf\mcp_config.json` (Windows) 또는 `~/.config/windsurf/mcp_config.json` (macOS/Linux)

```json
{
  "mcpServers": {
    "fullcontextinput_mcp": {
      "command": "fullcontextinput-mcp",
      "args": []
    }
  }
}
```

### VSCode Copilot
**설정**: 확장 프로그램 설정에서 MCP 서버 경로 지정

> **참고**: 설정 파일 수정 후 해당 AI 툴을 재시작하세요.

## 💡 사용 예시

### 🎯 디렉토리 컨텍스트 (핵심 기능)

**AI 툴에서 이렇게 입력하세요:**

```
"@src/components 디렉토리의 모든 파일을 분석해주세요"
"프로젝트/백엔드/api 폴더 전체를 보여주세요"
"utils/ 디렉토리에 있는 모든 함수를 리팩토링해주세요"
"`styles/components` 폴더의 CSS 파일들을 확인해주세요"
```

**MCP가 자동으로 수행:**
1. 🔍 디렉토리 경로 인식
2. 📂 해당 디렉토리 + 모든 하위 디렉토리 탐색
3. 📄 모든 코드 파일의 **전체 내용** 읽기
4. 🤖 완전한 컨텍스트를 AI에게 제공

```
"main.js 파일을 분석해주세요"
"`package.json` 파일을 확인해주세요"
```

### 🔍 파일 검색

```
"*.js 파일들을 찾아주세요"
"src/**/*.ts 파일들을 분석해주세요"
"components/*.tsx 파일들을 검토해주세요"
```

### ✍️ 코드 작성 (NEW! v1.1.0)

#### 📝 짧은 코드 작성 (write_file_complete)
```
"./src/utils.js 파일에 다음 코드를 작성해주세요"
"새로운 React 컴포넌트를 ./components/Button.tsx에 생성해주세요"
"API 라우터를 ./routes/users.js에 만들어주세요"
```

#### 🔧 긴 코드 수정 (write_file_diff)
```
"main.js 파일의 15-25줄에 다음 함수를 추가해주세요"
"server.js의 API 라우트 부분(50-80줄)을 다음과 같이 수정해주세요"
"기존 컴포넌트의 일부만 수정해주세요 (100-150줄)"
```

## 🛠️ 사용 가능한 도구 (v1.1.0 - 13개 도구)

### 📖 코드 읽기 도구들 (11개)

#### 1. extract_file_content
프롬프트에서 파일명/디렉토리를 추출하고 전체 코드를 반환합니다.
- `prompt` (필수): 분석할 프롬프트 텍스트
- `workspace_path` (선택): 워크스페이스 경로

#### 2. read_file_content
지정된 파일의 전체 내용을 읽습니다.
- `file_path` (필수): 읽을 파일의 경로

#### 3. read_directory_structure
디렉토리 구조와 파일 메타데이터만 제공 (파일 내용 제외).
- `directory_path` (필수): 분석할 디렉토리 경로
- `max_depth` (선택): 최대 탐색 깊이 (10)

#### 4. read_file_smart
파일 크기에 따라 지능적으로 읽기 방식을 결정. 200줄 미만은 전체, 이상은 자동 청킹.
- `file_path` (필수): 읽을 파일의 경로
- `chunk_number` (선택): 읽을 청크 번호 (0)

#### 5. read_directory_context
디렉토리의 모든 코드 파일을 재귀적으로 읽어 전체 컨텍스트를 제공.
- `directory_path` (필수): 읽을 디렉토리 경로
- `max_depth` (선택): 최대 탐색 깊이 (10)
- `max_files` (선택): 최대 파일 수 (50)

#### 6. get_file_info
파일의 기본 정보만 확인 (크기, 수정일, 줄 수 등).
- `file_path` (필수): 확인할 파일의 경로

#### 7. read_file_chunk
파일을 라인 단위로 안전하게 나눠서 읽기 (코드 깨짐 방지).
- `file_path` (필수): 읽을 파일의 경로
- `lines_per_chunk` (선택): 청크당 라인 수 (200)

#### 8. read_file_lines
파일의 지정된 라인 범위만 읽기.
- `file_path` (필수): 읽을 파일의 경로
- `start_line` (선택): 시작 라인 번호 (1)
- `end_line` (선택): 끝 라인 번호

#### 9. find_files
프로젝트에서 특정 패턴의 파일들을 찾기.
- `pattern` (필수): 검색할 파일 패턴
- `workspace_path` (선택): 검색할 워크스페이스 경로

#### 10-11. analyze_prompt_for_files (+ 기타 도구들)
프롬프트에서 파일/디렉토리 요청을 자동 감지하고 적절한 도구를 제안.

### ✍️ 코드 작성 도구들 (2개 - NEW!)

#### 12. write_file_complete 🆕
짧은 코드(5000-6000토큰 미만)를 파일에 완전히 작성. 파일이 없으면 생성, 있으면 덮어쓰기.
- `file_path` (필수): 작성할 파일의 경로
- `content` (필수): 파일에 작성할 전체 코드 내용
- `encoding` (선택): 파일 인코딩 (utf8)

#### 13. write_file_diff 🆕
긴 코드(6000토큰 초과)를 diff 방식으로 수정. 기존 파일을 읽고 지정된 라인 범위를 새로운 내용으로 교체.
- `file_path` (필수): 수정할 파일의 경로
- `start_line` (필수): 교체할 시작 라인 번호 (1부터)
- `end_line` (필수): 교체할 끝 라인 번호
- `new_content` (필수): 교체할 새로운 코드 내용
- `backup` (선택): 백업 파일 생성 여부 (true)

## 작동 원리

### 📖 코드 읽기 모드
1. **프롬프트 분석**: 사용자가 보낸 프롬프트에서 파일명/디렉토리를 정규표현식으로 추출
2. **파일 탐색**: 추출된 파일명으로 실제 파일 위치 확인 및 메타데이터 분석
3. **지능형 읽기**: 파일 크기에 따라 전체/청킹 방식 자동 결정, 컨텍스트 초과 방지
4. **컨텍스트 제공**: 라인 번호, 파일 정보, 완전한 코드를 AI에 전달

### ✍️ 코드 작성 모드 (v1.1.0 NEW!)
1. **코드 길이 판단**: 5000-6000토큰 기준으로 전체/diff 방식 선택
2. **안전 백업**: 파일 수정 전 타임스탬프 기반 백업 자동 생성
3. **라인 기반 수정**: diff 모드에서 정확한 라인 범위 지정으로 코드 깨짐 방지
4. **상세 피드백**: 수정 통계, 변경사항, 미리보기 제공
5. **캐시 관리**: 수정된 파일의 기존 캐시 자동 무효화

## 지원하는 파일 형식

- 모든 텍스트 기반 파일 (`.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.css`, `.scss`, `.html`, `.md`, `.txt` 등)
- 바이너리 파일은 지원하지 않음

## 🆕 v1.1.0 새로운 기능

### ✍️ 코드 작성 기능 추가!
- **write_file_complete**: 짧은 코드 전체 작성 (5000-6000토큰 미만)
- **write_file_diff**: 긴 코드 diff 방식 수정 (6000토큰 초과)
- **자동 백업**: 모든 수정 시 타임스탬프 기반 백업
- **디렉토리 자동 생성**: 필요한 경우 상위 디렉토리 자동 생성
- **상세한 수정 정보**: 변경 통계, 미리보기, 라인 수 변화 등

### 🛡️ 안전성 강화
- **Rate Limiting**: 과부하 방지를 위한 요청 제한
- **에러 처리**: 모든 메소드에 완벽한 예외 처리
- **캐시 무효화**: 파일 수정 시 기존 캐시 자동 제거
- **백업 시스템**: 수정 전 원본 파일 안전 보관

## 개발 및 기여

이 프로젝트는 오픈 소스이며, 기여를 환영합니다.

### 개발 환경 설정
```bash
git clone <repository-url>
cd fullcontextinput_mcp
npm install
npm run dev
```

### 테스트 실행
```bash
# 기본 MCP 기능 테스트
npm test

# 새로운 쓰기 기능 테스트
node test_new_write_features.js
```

## 라이선스

MIT License
