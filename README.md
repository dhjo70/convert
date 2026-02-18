# 🧠 Neural Network Training Visualizer

섭씨(°C) → 화씨(°F) 변환을 학습하는 신경망의 훈련 과정을 시각화하는 프로젝트입니다.

> **목표 공식**: `F = 1.8 × C + 32`

## 구조

| 파일 | 설명 |
|------|------|
| `export_training.py` | 신경망 학습 실행 및 결과 JSON 내보내기 (1000 epochs) |
| `index.html` | 학습 과정 인터랙티브 시각화 웹페이지 |

## 실행 방법

### 1. 학습 데이터 생성

```bash
uv run python export_training.py
```

`training_history.json` 파일이 생성됩니다.

### 2. 시각화 확인

```bash
# 로컬 서버 실행
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속하여 시각화 확인.

## 기술 스택

- **Python 3.11+** / TensorFlow / NumPy
- **Chart.js** (프론트엔드 차트)
- **uv** (패키지 관리)
