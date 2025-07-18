# FullContextInput MCP

AI 코딩 툴(Claude Code, Cursor, Windsurf, VSCode Copilot 등)에서 사용할 수 있는 MCP(Model Context Protocol) 서버입니다.

## 주요 기능

- **프롬프트 파일명 추출**: 사용자 프롬프트에서 파일명을 자동으로 추출
- **전체 코드 읽기**: 지정된 파일의 전체 코드를 읽어와 AI에게 제공
- **파일 검색**: 패턴을 통한 파일 검색 기능
- **워크스페이스 지원**: 다양한 프로젝트 워크스페이스에서 작동

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 서버 실행
```bash
npm start
```

### 3. 개발 모드 실행
```bash
npm run dev
```

## MCP 클라이언트 설정

### Claude Desktop 설정
`claude_desktop_config.json` 파일에 다음 내용을 추가:

```json
{
  "mcpServers": {
    "fullcontextinput_mcp": {
      "command": "node",
      "args": ["C:\\Users\\Administrator\\CascadeProjects\\fullcontextinput_mcp\\server.js"],
      "env": {}
    }
  }
}
```

### 기타 AI 툴 설정
- **Cursor**: MCP 플러그인 설정에서 서버 경로 지정
- **Windsurf**: MCP 서버 구성에서 추가
- **VSCode Copilot**: 확장 프로그램 설정에서 MCP 서버 연결

## 사용 가능한 도구

### 1. extract_file_content
프롬프트에서 파일명을 추출하고 해당 파일의 전체 코드를 반환합니다.

**매개변수:**
- `prompt` (필수): 분석할 프롬프트 텍스트
- `workspace_path` (선택): 워크스페이스 경로

**예시:**
```
"src/components/Button.tsx 파일을 수정해주세요"
```

### 2. read_file_content
지정된 파일의 전체 내용을 읽습니다.

**매개변수:**
- `file_path` (필수): 읽을 파일의 경로

### 3. find_files
프로젝트에서 특정 패턴의 파일들을 찾습니다.

**매개변수:**
- `pattern` (필수): 검색할 파일 패턴
- `workspace_path` (선택): 검색할 워크스페이스 경로

**예시 패턴:**
- `*.js` - 모든 JavaScript 파일
- `src/**/*.ts` - src 디렉토리 내 모든 TypeScript 파일
- `components/*.tsx` - components 디렉토리 내 모든 TSX 파일

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
