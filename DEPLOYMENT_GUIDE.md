# 🚀 FullContextInput MCP 배포 및 사용 가이드

## 📋 목차
1. [Windsurf에서 사용하기](#windsurf에서-사용하기)
2. [Cursor에서 사용하기](#cursor에서-사용하기)
3. [Claude Desktop에서 사용하기](#claude-desktop에서-사용하기)
4. [전역 설치 방법](#전역-설치-방법)
5. [배포 옵션](#배포-옵션)
6. [사용 예시](#사용-예시)
7. [트러블슈팅](#트러블슈팅)

---

## 🌊 Windsurf에서 사용하기

### 방법 1: 로컬 설정 (권장)

1. **MCP 서버 설정**
   ```bash
   # 프로젝트 디렉토리에서
   npm install  # 의존성 설치
   npm start    # 서버 실행 테스트
   ```

2. **Windsurf 설정 파일 생성**
   
   **Windows 경로**: `%APPDATA%\Windsurf\mcp_config.json`
   ```json
   {
     "mcpServers": {
       "fullcontextinput_mcp": {
         "command": "node",
         "args": ["C:\\Users\\Administrator\\CascadeProjects\\fullcontextinput_mcp\\server.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

   **macOS/Linux 경로**: `~/.config/windsurf/mcp_config.json`
   ```json
   {
     "mcpServers": {
       "fullcontextinput_mcp": {
         "command": "node",
         "args": ["/absolute/path/to/fullcontextinput_mcp/server.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. **Windsurf 재시작**
   - Windsurf 완전 종료 후 다시 시작
   - MCP 서버가 자동으로 연결됨

### 방법 2: 전역 설치

1. **NPM 글로벌 설치**
   ```bash
   npm install -g .
   ```

2. **설정 파일 수정**
   ```json
   {
     "mcpServers": {
       "fullcontextinput_mcp": {
         "command": "fullcontextinput_mcp",
         "args": [],
         "env": {}
       }
     }
   }
   ```

---

## 🎯 Cursor에서 사용하기

### 방법 1: 로컬 설정

1. **Cursor 설정 파일 위치**
   
   **Windows**: `%APPDATA%\Cursor\User\settings.json`
   **macOS**: `~/Library/Application Support/Cursor/User/settings.json`
   **Linux**: `~/.config/Cursor/User/settings.json`

2. **settings.json에 추가**
   ```json
   {
     "mcp": {
       "servers": {
         "fullcontextinput_mcp": {
           "command": "node",
           "args": ["C:\\Users\\Administrator\\CascadeProjects\\fullcontextinput_mcp\\server.js"],
           "env": {
             "NODE_ENV": "production"
           }
         }
       }
     }
   }
   ```

3. **Cursor 재시작**

### 방법 2: 워크스페이스 설정

1. **프로젝트 루트에 `.cursor/config.json` 생성**
   ```json
   {
     "mcp": {
       "servers": {
         "fullcontextinput_mcp": {
           "command": "node",
           "args": ["./path/to/fullcontextinput_mcp/server.js"],
           "env": {}
         }
       }
     }
   }
   ```

---

## 🤖 Claude Desktop에서 사용하기

1. **Claude Desktop 설정 파일 위치**
   
   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Linux**: `~/.config/claude/claude_desktop_config.json`

2. **설정 파일 내용**
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

---

## 🌍 전역 설치 방법

### 1. package.json 수정

현재 `package.json`에 다음 추가:

```json
{
  "name": "fullcontextinput_mcp",
  "version": "1.0.0",
  "bin": {
    "fullcontextinput_mcp": "./server.js"
  },
  "preferGlobal": true
}
```

### 2. 전역 설치 실행

```bash
npm install -g .
```

### 3. 전역 사용

이제 어디서든 다음 명령어로 실행 가능:
```bash
fullcontextinput_mcp
```

---

## 🚀 배포 옵션

### 옵션 1: NPM 패키지 배포

1. **NPM 계정 생성** (https://www.npmjs.com/)
2. **패키지 배포**
   ```bash
   npm login
   npm publish
   ```
3. **사용자 설치**
   ```bash
   npm install -g fullcontextinput_mcp
   ```

### 옵션 2: GitHub 배포

1. **GitHub 저장소 생성**
2. **코드 업로드**
3. **README 및 설치 가이드 작성**
4. **Release 생성**

### 옵션 3: 실행 파일 배포

1. **pkg 사용하여 실행 파일 생성**
   ```bash
   npm install -g pkg
   pkg server.js --output fullcontextinput_mcp
   ```

---

## 💡 사용 예시

### Windsurf에서 사용

```
사용자: "@src/components 디렉토리의 모든 파일을 분석해주세요"
AI: [MCP가 자동으로 src/components 디렉토리의 모든 파일을 읽고 전체 코드를 제공]

사용자: "프로젝트/백엔드/api 폴더 전체를 보여주세요"
AI: [해당 디렉토리의 모든 코드 파일을 재귀적으로 읽어 제공]
```

### Cursor에서 사용

```
사용자: "utils/ 디렉토리에 있는 모든 함수를 리팩토링해주세요"
AI: [MCP가 utils 디렉토리의 모든 파일을 읽고 완전한 컨텍스트를 제공]
```

---

## 🔧 트러블슈팅

### 문제 1: MCP 서버 연결 실패

**해결방법:**
1. Node.js 설치 확인: `node --version`
2. 경로 확인: 절대 경로 사용
3. 권한 확인: 관리자 권한으로 실행

### 문제 2: 파일 읽기 권한 오류

**해결방법:**
1. 디렉토리 권한 확인
2. 무시 패턴 추가
3. 환경 변수 설정

### 문제 3: 성능 이슈

**해결방법:**
1. `max_depth` 조정
2. `include_extensions` 필터링
3. 큰 파일 제외

---

## 📞 지원 및 문의

- GitHub Issues: [프로젝트 저장소]
- 이메일: [연락처]
- 문서: [위키 링크]

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능
