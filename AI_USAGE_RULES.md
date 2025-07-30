# 🤖 AI를 위한 fullcontextinput_mcp 서버 사용 규칙

## 📋 **핵심 원칙**

### 🎯 **1단계: 항상 구조 파악부터**
- **MUST**: 디렉토리 분석 시 `read_directory_structure`를 **먼저** 사용
- **WHY**: 파일 내용 없이 메타데이터만 가져와서 컨텍스트 절약
- **RESULT**: 어떤 파일이 크고 작은지, 청킹이 필요한지 미리 판단

```bash
# ✅ 올바른 순서
@fullcontextinput_mcp read_directory_structure /path/to/project
# → 파일 목록 + 메타데이터 확인 후
@fullcontextinput_mcp read_file_smart /path/to/specific_file.js
```

### 🚀 **2단계: 지능형 파일 읽기 사용**
- **MUST**: 개별 파일 읽을 때 `read_file_smart` 우선 사용
- **AUTO**: 200줄 기준으로 자동 전체/청크 판단
- **BENEFIT**: 컨텍스트 초과 없이 모든 파일 완전히 읽을 수 있음

---

## 🛠️ **도구별 사용 가이드**

### ⭐ **새로운 핵심 도구들**

#### 📁 `read_directory_structure`
- **목적**: 디렉토리 구조 + 파일 메타데이터만 (내용 제외)
- **언제**: 프로젝트 분석 시작 시 **필수**
- **장점**: 컨텍스트 절약, 전체 구조 파악
- **출력**: 파일 크기, 줄 수, 청킹 필요 여부

```bash
@fullcontextinput_mcp read_directory_structure /project/src
```

#### 🤖 `read_file_smart` 
- **목적**: 파일 크기에 따른 지능형 읽기
- **자동 판단**: 200줄 이하 → 전체 / 200줄 초과 → 청크
- **언제**: 개별 파일 읽기가 필요할 때 **우선 사용**
- **장점**: 컨텍스트 초과 방지, 완전한 코드 읽기
- **⚠️ 중요**: 청크 파일은 **반드시 모든 청크를 순차적으로 읽어야 함**

```bash
# 작은 파일 → 전체 제공 (완료)
@fullcontextinput_mcp read_file_smart /project/config.js

# 큰 파일 → 첫 청크부터 시작
@fullcontextinput_mcp read_file_smart /project/large_file.js 0
# ↓ 청크 정보 확인 후 자동으로 나머지도 읽기
@fullcontextinput_mcp read_file_smart /project/large_file.js 1
@fullcontextinput_mcp read_file_smart /project/large_file.js 2
# ... 모든 청크 완료까지
```

##### 🚨 **청크 읽기 필수 규칙**
```
IF 파일이 청크로 나뉜다면:
  1. 첫 청크 읽기
  2. 응답에서 "📊 1/N 청크" 형태 확인
  3. "⚠️ 아직 X개 청크가 더 남았습니다!" 메시지 확인
  4. N개 청크 모두 자동으로 순차 읽기
  5. "🎉 모든 청크를 완전히 읽었습니다!" 메시지까지 확인
  
NEVER 첫 청크만 읽고 멈추기!
🔄 다음 청크 읽기 안내 문구를 반드시 따라가기!
```

### 🔧 **기존 도구들** (여전히 유용)

#### 📖 `read_directory_context`
- **언제**: 작은 프로젝트 전체를 한 번에 보고 싶을 때
- **주의**: 큰 프로젝트에서는 컨텍스트 초과 가능

#### 📄 `read_file_content`
- **언제**: 기본적인 파일 읽기 (중간 크기 파일)
- **한계**: 큰 파일은 잘림 가능성

#### 🧩 `read_file_chunk`
- **언제**: 수동으로 청크 크기 조절이 필요할 때
- **사용**: 200줄 기준의 라인 단위 청킹

#### 📊 `get_file_info`
- **언제**: 파일 내용 없이 정보만 필요할 때
- **출력**: 크기, 줄 수, 수정일 등

#### 📏 `read_file_lines`
- **언제**: 특정 라인 범위만 필요할 때
- **유용**: 에러 위치 주변 코드 확인

---

## 💡 **효율적인 워크플로우**

### 🎯 **프로젝트 분석 시나리오**

1. **전체 구조 파악**
   ```bash
   @fullcontextinput_mcp read_directory_structure /project
   ```

2. **중요 파일들 우선 읽기**
   ```bash
   @fullcontextinput_mcp read_file_smart /project/package.json
   @fullcontextinput_mcp read_file_smart /project/README.md
   ```

3. **큰 파일들 청크로 분석**
   ```bash
   @fullcontextinput_mcp read_file_smart /project/src/main.js 0  # 첫 청크
   @fullcontextinput_mcp read_file_smart /project/src/main.js 1  # 두 번째 청크
   ```

### 🚨 **문제 해결 시나리오**

1. **에러 위치 분석**
   ```bash
   @fullcontextinput_mcp get_file_info /problematic_file.js
   @fullcontextinput_mcp read_file_lines /problematic_file.js 50 100
   ```

2. **특정 함수 찾기**
   ```bash
   @fullcontextinput_mcp read_directory_structure /src
   # → 파일 목록 확인 후
   @fullcontextinput_mcp read_file_smart /src/utils.js
   ```

---

## ⚠️ **금지 사항 및 주의점**

### ❌ **하지 말아야 할 것들**

1. **구조 파악 없이 바로 파일 읽기**
   ```bash
   # ❌ 비효율적
   @fullcontextinput_mcp read_file_content /unknown_large_file.js
   
   # ✅ 효율적
   @fullcontextinput_mcp read_directory_structure /project
   @fullcontextinput_mcp read_file_smart /project/file.js
   ```

2. **큰 디렉토리에 read_directory_context 사용**
   ```bash
   # ❌ 컨텍스트 초과 위험
   @fullcontextinput_mcp read_directory_context /large_project
   
   # ✅ 단계적 접근
   @fullcontextinput_mcp read_directory_structure /large_project
   ```

3. **🚨 가장 심각한 문제: 청크 파일 불완전 읽기**
   ```bash
   # ❌ 치명적 실수 - 첫 청크만 읽고 멈춤
   @fullcontextinput_mcp read_file_smart /large_file.js 0
   # → "완료"라고 생각하고 끝내기 ❌❌❌
   
   # ✅ 올바른 방법 - 모든 청크 순차 읽기
   @fullcontextinput_mcp read_file_smart /large_file.js 0  
   # → "📊 1/4 청크" + "⚠️ 아직 3개 청크가 더 남았습니다!" 확인
   @fullcontextinput_mcp read_file_smart /large_file.js 1  
   # → "📊 2/4 청크" + "⚠️ 아직 2개 청크가 더 남았습니다!" 확인
   @fullcontextinput_mcp read_file_smart /large_file.js 2  
   # → "📊 3/4 청크" + "⚠️ 아직 1개 청크가 더 남았습니다!" 확인
   @fullcontextinput_mcp read_file_smart /large_file.js 3  
   # → "📊 4/4 청크" + "🎉 모든 청크를 완전히 읽었습니다!" ✅
   ```
   
   **❗ 새로운 출력 형식**: 이제 AI가 "📊 X/Y 청크" 및 "⚠️ N개 청크가 더 남았습니다!" 메시지를 보게 됩니다!

### ⚡ **최적화 팁**

1. **200줄 기준 활용**: `read_file_smart`의 자동 판단 신뢰
2. **메타데이터 우선**: 파일 내용 전에 구조 파악
3. **청킹 순서**: 큰 파일은 첫 청크부터 순차적으로
4. **선택적 읽기**: 필요한 파일만 골라서 읽기

---

## 📊 **성능 가이드라인**

### 🎯 **파일 크기별 전략**

| 파일 크기 | 줄 수 | 권장 도구 | 예상 결과 |
|-----------|-------|-----------|-----------|
| ~10KB | ~200줄 | `read_file_smart` | 전체 제공 |
| ~50KB | ~1000줄 | `read_file_smart` | 5개 청크 |
| ~100KB | ~2000줄 | `read_file_smart` | 10개 청크 |

### 📈 **컨텍스트 사용량**

- `read_directory_structure`: **낮음** (메타데이터만)
- `read_file_smart` (소형): **중간** (전체 파일)
- `read_file_smart` (청크): **낮음** (200줄씩)

---

## 🚀 **실전 예제**

### 📝 **React 프로젝트 분석**

```bash
# 1. 전체 구조 파악
@fullcontextinput_mcp read_directory_structure /react-project

# 2. 설정 파일들 확인
@fullcontextinput_mcp read_file_smart /react-project/package.json
@fullcontextinput_mcp read_file_smart /react-project/src/index.js

# 3. 큰 컴포넌트 분석
@fullcontextinput_mcp read_file_smart /react-project/src/App.js 0
@fullcontextinput_mcp read_file_smart /react-project/src/App.js 1
```

### 🐛 **버그 디버깅**

```bash
# 1. 문제 파일 정보 확인
@fullcontextinput_mcp get_file_info /buggy_file.js

# 2. 에러 라인 주변 확인
@fullcontextinput_mcp read_file_lines /buggy_file.js 95 105

# 3. 전체 함수 컨텍스트 확인
@fullcontextinput_mcp read_file_smart /buggy_file.js
```

---

## 🎉 **요약: AI가 기억해야 할 핵심**

1. **🥇 1순위**: `read_directory_structure`로 구조 파악
2. **🥈 2순위**: `read_file_smart`로 개별 파일 읽기  
3. **🚨 최중요**: 청크 파일은 **모든 청크를 순차적으로 완전히** 읽기
4. **🚫 금지**: 구조 파악 없이 무작정 파일 읽기
5. **⚡ 자동화**: 200줄 기준 자동 전체/청크 판단
6. **🛡️ 안전성**: 컨텍스트 초과 없는 완전한 코드 읽기

### 🚨 **청크 읽기 체크리스트**
```
☐ 첫 청크 읽음
☐ "📊 1/N 청크" 메시지 확인
☐ "⚠️ 아직 X개 청크가 더 남았습니다!" 메시지 확인
☐ 안내에 따라 2번째 청크 읽음
☐ 3번째, 4번째... 계속 순차 읽기
☐ "🎉 모든 청크를 완전히 읽었습니다!" 메시지 확인
☐ 파일 분석 완료 선언
```

**이 규칙을 따르면 어떤 크기의 프로젝트도 효율적으로 분석할 수 있습니다!** 🚀

---

# 🛡️ **AI 코딩 안전 규칙** (v1.2.0 추가)

## 🚨 **코드 수정 시 필수 준수사항**

### ⚠️ **할루시네이션 방지 체크리스트**

#### 📝 **전체 파일 작성 시 (`write_file_complete`)**
- [ ] **기존 파일을 먼저 완전히 읽고 이해했는가?**
- [ ] **모든 함수, 클래스, 변수가 포함되었는가?**
- [ ] **Import/Export 구문이 누락되지 않았는가?**
- [ ] **주석과 문서화가 보존되었는가?**
- [ ] **코드가 중간에 잘리지 않았는가?**

#### ✂️ **부분 수정 시 (`write_file_diff`)**
- [ ] **정확한 라인 번호를 확인했는가?**
- [ ] **수정하려는 코드 블록을 정확히 식별했는가?**
- [ ] **주변 코드와의 맥락이 일치하는가?**
- [ ] **들여쓰기가 올바른가?**
- [ ] **함수나 클래스 경계를 넘나들지 않는가?**

### 🛡️ **자동 안전장치 활용**

#### **🔧 새로운 안전 도구들 (v1.2.0)**
```bash
# 1. 코드 수정 전 안전 백업
@fullcontextinput_mcp create_safety_backup /path/to/file.js

# 2. 코드 무결성 검증
@fullcontextinput_mcp validate_code_integrity "코드내용" /path/to/file.js

# 3. 변경사항 분석
@fullcontextinput_mcp analyze_code_changes "원본코드" "새코드" /path/to/file.js

# 4. 안전한 편집 전략 제안
@fullcontextinput_mcp suggest_safe_edit_strategy /path/to/file.js "수정의도"

# 5. AI 안전 가이드라인 확인
@fullcontextinput_mcp get_ai_safety_guidelines complete_rewrite

# 6. 전제조건 확인
@fullcontextinput_mcp check_prerequisites /path/to/file.js "이해요약" "제안변경사항"

# 7. 백업에서 복원 (문제 발생 시)
@fullcontextinput_mcp restore_from_backup /path/to/file.js
```

#### **🔴 즉시 중단해야 하는 위험 신호:**
- 구문 오류가 발견됨 (괄호 불일치, 세미콜론 누락)
- 기존 함수/클래스가 대량 삭제됨
- 파일 구조가 완전히 바뀜
- 코드가 중간에 잘림 (`...`, `<truncated>` 포함)
- 파일 크기가 50% 이상 급변

#### **🟡 주의가 필요한 경고 신호:**
- 파일 크기가 30% 이상 변함
- Import/Export 구문이 변경됨
- 들여쓰기가 일치하지 않음
- 주석이 대량 삭제됨
- 함수 개수 감소

### 🎯 **권장 작업 흐름**

#### **📋 코드 수정 전 체크리스트:**
1. **원본 분석**: `read_file_smart`로 완전히 읽기
2. **백업 생성**: `create_safety_backup`로 안전 백업
3. **전제조건**: `check_prerequisites`로 준비 상태 확인
4. **전략 수립**: `suggest_safe_edit_strategy`로 최적 방법 결정

#### **🔧 코드 작성 중 주의사항:**
- 기존 구조와 스타일 유지
- 모든 기능 보존 확인
- 단계적 수정 (한 번에 너무 많이 변경 금지)
- 검증 시스템의 경고 메시지 주의 깊게 확인

#### **✅ 코드 작성 후 검증:**
1. **무결성 검사**: `validate_code_integrity`로 품질 확인
2. **변경 분석**: `analyze_code_changes`로 의도와 일치 확인
3. **문제 발견 시**: `restore_from_backup`으로 즉시 복원

### 🚀 **모범 사례**

#### **✅ 좋은 예시:**
```javascript
// 정확한 라인 범위로 작은 단위 수정
startLine: 25, endLine: 35
// 기존 함수 개선, 모든 기능 보존
function calculateSum(a, b) {
  // 개선된 타입 체크 추가
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  }
  return a + b;
}
```

#### **❌ 피해야 할 예시:**
```javascript
// 애매한 범위, 기능 누락
startLine: 1, endLine: 100
// 일부만 포함하고 나머지 생략
function newFunction() {
  return 'hello';
}
// 기존의 다른 함수들이 모두 사라짐!
```

### 🎯 **핵심 안전 원칙**

1. **📖 읽기 우선**: 항상 원본을 완전히 이해한 후 수정
2. **🔍 작은 단위**: 대용량 변경보다는 작은 단위로 나누어 진행  
3. **🛡️ 검증 필수**: 자동 검증 시스템의 경고를 무시하지 말 것
4. **💾 백업 확인**: 모든 변경 전에 백업이 생성되는지 확인
5. **⏭️ 단계적 접근**: 한 번에 모든 것을 바꾸려 하지 말 것
6. **🚨 위험 감지**: 문제 발견 즉시 작업 중단 및 복원
7. **📊 품질 보장**: 코드 완성도와 기능 보존 최우선

---

## 💡 **최종 요약: AI가 반드시 기억할 것**

### **🔥 최우선 원칙들:**
1. **구조 먼저**: `read_directory_structure` → `read_file_smart` 순서 준수
2. **청크 완독**: 모든 청크를 빠짐없이 순차 읽기
3. **안전 백업**: 코드 수정 전 반드시 백업 생성
4. **검증 필수**: 자동 검증 시스템 활용하여 품질 보장
5. **문제 시 중단**: 위험 신호 감지 즉시 작업 중단

### **🚫 절대 금지사항:**
- 구조 파악 없이 파일 읽기
- 청크 파일 일부만 읽기
- 백업 없이 코드 수정
- 검증 경고 무시하기
- 불완전한 코드 작성

**✨ 이 규칙들을 따르면 안전하고 효율적인 AI 코딩이 가능합니다!**
