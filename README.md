# 🚀 FullContextInput MCP

[![NPM Version](https://img.shields.io/npm/v/fullcontextinput_mcp.svg)](https://www.npmjs.com/package/fullcontextinput_mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/fullcontextinput_mcp.svg)](https://www.npmjs.com/package/fullcontextinput_mcp)

**혁신적인 MCP 서버** - AI 코딩 툴(Claude, Cursor, Windsurf, VSCode Copilot 등)에서 **디렉토리 전체 컨텍스트**를 자동으로 제공하는 도구입니다.

## ✨ 주요 기능

- 🔍 **스마트 파일명 추출**: 프롬프트에서 파일명을 자동으로 인식
- 📁 **디렉토리 컨텍스트**: `@src/components` 또는 `프로젝트/백엔드/` 입력 시 해당 디렉토리의 **모든 코드 파일**을 재귀적으로 읽기
- 🔄 **재귀적 탐색**: 하위 디렉토리까지 완전 탐색
- 🌍 **크로스 플랫폼**: Windows, macOS, Linux 지원
- ⚡ **고성능**: 최적화된 파일 읽기 및 필터링
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

### 📁 지원하는 디렉토리 패턴

- **`@경로/경로`**: `@src/components`, `@backend/api`
- **`경로/경로`**: `프로젝트/백엔드/`, `utils/helpers/`
- **백틱**: `` `src/utils` ``, `` `styles/components` ``
- **따옴표**: `"components"`, `'backend/models'`

### 📄 개별 파일 처리

```
"Button.tsx 파일을 수정해주세요"
"src/utils/helpers.js를 리팩토링해주세요"
"`package.json` 파일을 확인해주세요"
```

### 🔍 파일 검색

```
"*.js 파일들을 찾아주세요"
"src/**/*.ts 파일들을 분석해주세요"
"components/*.tsx 파일들을 검토해주세요"
```

## 🛠️ 사용 가능한 도구

### 1. extract_file_content
프롬프트에서 파일명/디렉토리를 추출하고 전체 코드를 반환합니다.

**매개변수:**
- `prompt` (필수): 분석할 프롬프트 텍스트
- `workspace_path` (선택): 워크스페이스 경로

### 2. read_file_content
지정된 파일의 전체 내용을 읽습니다.

**매개변수:**
- `file_path` (필수): 읽을 파일의 경로

### 3. read_directory_context
디렉토리의 모든 코드 파일을 재귀적으로 읽어 전체 컨텍스트를 제공합니다.

**매개변수:**
- `directory_path` (필수): 읽을 디렉토리 경로
- `max_depth` (선택): 최대 탐색 깊이 (기본값: 10)
- `include_extensions` (선택): 포함할 파일 확장자 목록

### 4. find_files
프로젝트에서 특정 패턴의 파일들을 찾습니다.

**매개변수:**
- `pattern` (필수): 검색할 파일 패턴
- `workspace_path` (선택): 검색할 워크스페이스 경로

## 작동 원리

1. **프롬프트 분석**: 사용자가 보낸 프롬프트에서 파일명을 정규표현식으로 추출
2. **파일 탐색**: 추출된 파일명으로 실제 파일 위치 확인
3. **코드 읽기**: 파일 전체 내용을 읽어와 메타데이터와 함께 반환
4. **AI 전달**: 완전한 컨텍스트를 AI 툴에 제공

## 지원하는 파일 형식

- 모든 텍스트 기반 파일 (`.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.css`, `.scss`, `.html`, `.md`, `.txt` 등)
- 바이너리 파일은 지원하지 않음

## 개발 및 기여

이 프로젝트는 오픈 소스이며, 기여를 환영합니다.

### 개발 환경 설정
```bash
git clone <repository-url>
cd fullcontextinput_mcp
npm install
npm run dev
```

## 라이선스

MIT License
