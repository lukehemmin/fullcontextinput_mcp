# Tests Directory

이 디렉토리는 fullcontextinput_mcp 서버의 모든 테스트 파일과 샘플 파일들을 포함합니다.

## 📂 Directory Structure

```
tests/
├── README.md                     # 이 파일
├── output/                       # 테스트 출력 파일들
│   └── original_calc.js         # 파일 작성 테스트 결과
├── samples/                      # 테스트용 샘플 파일들
│   ├── Component.tsx            # React 컴포넌트 샘플
│   └── sample.js                # 기본 JavaScript 샘플
└── [테스트 파일들]               # 각종 MCP 기능 테스트
```

## 🧪 Test Files

### Core Functionality Tests
- **`test_mcp.js`** (178줄) - 기본 MCP 서버 연결 및 도구 테스트
- **`test_new_features.js`** (244줄) - 새로 추가된 기능들 종합 테스트
- **`test_new_mcp_tools.js`** (197줄) - 최신 MCP 도구들 테스트

### File Operation Tests  
- **`test_write_tools.js`** (63줄) - 파일 작성 도구 테스트
- **`test_new_write_features.js`** (129줄) - 새로운 파일 작성 기능 테스트

### Size-based Tests
- **`test_small.js`** (9줄) - 작은 파일 처리 테스트
- **`test_medium.js`** - 중간 크기 파일 처리 테스트
- **`test_medium_real.js`** - 실제 중간 크기 파일 시나리오
- **`test_large.js`** - 큰 파일 청킹 테스트

### Specific Feature Tests
- **`test_directory_context.js`** - 디렉토리 컨텍스트 읽기 테스트

## 📁 Subdirectories

### `samples/`
테스트에 사용되는 다양한 형태의 샘플 파일들

### `output/`  
테스트 실행 결과로 생성되는 파일들

## 🚀 Running Tests

테스트 파일들은 Node.js로 직접 실행할 수 있습니다:

```bash
cd tests
node test_mcp.js           # 기본 MCP 테스트
node test_write_tools.js   # 파일 작성 테스트
# ... 기타 테스트 파일들
```

## 📝 Notes

- 모든 테스트는 독립적으로 실행 가능하도록 설계됨
- 테스트 결과는 `output/` 폴더에 저장됨
- 새로운 기능 추가 시 해당하는 테스트 파일도 업데이트 필요
