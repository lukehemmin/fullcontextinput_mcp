# 🚀 FullContextInput MCP 공개 배포 가이드

## 📋 목차
1. [NPM 배포하기](#npm-배포하기)
2. [GitHub 배포하기](#github-배포하기)
3. [사용자 설치 방법](#사용자-설치-방법)
4. [버전 관리](#버전-관리)
5. [홍보 및 마케팅](#홍보-및-마케팅)

---

## 📦 NPM 배포하기

### 1단계: NPM 계정 생성
1. [NPM 웹사이트](https://www.npmjs.com/)에서 계정 생성
2. 이메일 인증 완료

### 2단계: NPM 로그인
```bash
npm login
```
- Username 입력
- Password 입력 
- Email 입력
- 2FA 코드 입력 (활성화된 경우)

### 3단계: 패키지 정보 확인
```bash
npm whoami  # 로그인 확인
npm view fullcontextinput_mcp  # 패키지명 중복 확인
```

### 4단계: 패키지 배포
```bash
npm publish
```

### 5단계: 배포 확인
```bash
npm view fullcontextinput_mcp
```

---

## 🐙 GitHub 배포하기

### 1단계: GitHub 저장소 생성
1. [GitHub](https://github.com)에 로그인
2. `New repository` 클릭
3. 저장소 이름: `fullcontextinput_mcp`
4. 설명: `MCP 서버 - AI 툴에서 프롬프트의 파일명/디렉토리를 자동 인식하고 전체 코드 컨텍스트를 제공하는 도구`
5. Public 선택
6. `Create repository` 클릭

### 2단계: Git 초기화 및 업로드
```bash
# Git 초기화
git init

# 원격 저장소 추가
git remote add origin https://github.com/yourusername/fullcontextinput_mcp.git

# 파일 추가
git add .

# 커밋
git commit -m "Initial release: FullContextInput MCP v1.0.0"

# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

### 3단계: GitHub Release 생성
1. GitHub 저장소 페이지에서 `Releases` 클릭
2. `Create a new release` 클릭
3. Tag: `v1.0.0`
4. Title: `FullContextInput MCP v1.0.0`
5. Description 작성:
   ```markdown
   ## 🚀 FullContextInput MCP v1.0.0
   
   AI 코딩 툴(Claude, Cursor, Windsurf, VSCode Copilot 등)에서 사용할 수 있는 혁신적인 MCP 서버입니다.
   
   ### ✨ 주요 기능
   - 프롬프트에서 파일명/디렉토리 자동 인식
   - 재귀적 디렉토리 코드 읽기
   - 전체 코드 컨텍스트 제공
   - 크로스 플랫폼 지원 (Windows, macOS, Linux)
   
   ### 📦 설치 방법
   ```bash
   npm install -g fullcontextinput_mcp
   ```
   
   ### 🔧 사용 방법
   자세한 사용법은 [README.md](README.md)를 참고하세요.
   ```
6. `Publish release` 클릭

---

## 👥 사용자 설치 방법

### NPM을 통한 설치
```bash
# 전역 설치
npm install -g fullcontextinput_mcp

# 설치 확인
fullcontextinput-mcp --help
```

### GitHub에서 직접 설치
```bash
# 저장소 클론
git clone https://github.com/yourusername/fullcontextinput_mcp.git

# 디렉토리 이동
cd fullcontextinput_mcp

# 의존성 설치
npm install

# 전역 설치
npm install -g .
```

---

## 🔄 버전 관리

### 버전 업데이트
```bash
# 패치 버전 (1.0.0 → 1.0.1)
npm version patch

# 마이너 버전 (1.0.0 → 1.1.0)
npm version minor

# 메이저 버전 (1.0.0 → 2.0.0)
npm version major
```

### 업데이트 배포
```bash
# NPM 배포
npm publish

# GitHub 푸시
git push origin main --tags
```

---

## 📢 홍보 및 마케팅

### 1. NPM 패키지 최적화
- 좋은 README 작성
- 키워드 최적화
- 스크린샷/GIF 추가

### 2. 커뮤니티 공유
- **Reddit**: r/MachineLearning, r/programming
- **Discord**: Claude, Cursor, Windsurf 커뮤니티
- **Twitter/X**: AI 개발자 태그
- **LinkedIn**: AI 개발 그룹

### 3. 블로그 포스팅
- **Medium**: 기술 블로그
- **Dev.to**: 개발자 커뮤니티
- **개인 블로그**: 상세한 사용법

### 4. 유튜브 데모
- 설치 및 사용법 동영상
- 실제 사용 사례 시연

---

## 📊 성과 추적

### NPM 통계
```bash
npm view fullcontextinput_mcp
```

### GitHub 통계
- Stars 수
- Forks 수
- Issues/PRs
- Contributors

### 사용자 피드백
- GitHub Issues 모니터링
- 사용자 리뷰 수집
- 개선 사항 반영

---

## 🔧 지속적인 개선

### 1. 사용자 요청사항 반영
- 새로운 AI 툴 지원
- 성능 최적화
- 버그 수정

### 2. 문서화 개선
- 더 자세한 가이드
- 다양한 언어 지원
- 비디오 튜토리얼

### 3. 기능 확장
- 새로운 파일 형식 지원
- 커스텀 필터 기능
- 설정 파일 지원

---

## 🎯 성공 지표

### 단기 목표 (1개월)
- NPM 다운로드 1,000회
- GitHub Stars 100개
- 사용자 피드백 10개

### 중기 목표 (3개월)
- NPM 다운로드 10,000회
- GitHub Stars 500개
- 커뮤니티 기여자 5명

### 장기 목표 (6개월)
- NPM 다운로드 50,000회
- GitHub Stars 1,000개
- 다양한 AI 툴 공식 지원

---

## 📞 지원 및 문의

- **GitHub**: https://github.com/yourusername/fullcontextinput_mcp
- **NPM**: https://www.npmjs.com/package/fullcontextinput_mcp
- **이메일**: your.email@example.com
- **Twitter**: @yourusername

---

## 🔒 보안 고려사항

### 1. 민감한 정보 보호
- `.env` 파일 무시
- API 키 제외
- 개인정보 필터링

### 2. 코드 검토
- 악성 코드 스캔
- 의존성 보안 검사
- 정기적인 업데이트

### 3. 사용자 가이드
- 안전한 사용법 안내
- 권한 관리 가이드
- 보안 베스트 프랙티스
