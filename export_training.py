import tensorflow as tf
import numpy as np
import json

# 데이터 준비
celsius_q    = np.array([-40, -10,  0,  8, 15, 22,  38],  dtype=float)
fahrenheit_a = np.array([-40,  14, 32, 46.4, 59, 71.6, 100.4],  dtype=float)

# 모델 생성
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=[1]),
    tf.keras.layers.Dense(units=1)
])

# 학습률 스케줄링: 처음엔 빠르게, 나중엔 세밀하게 조정
lr_schedule = tf.keras.optimizers.schedules.CosineDecay(
    initial_learning_rate=0.1,
    decay_steps=1000,
    alpha=0.001,  # 최소 학습률 = 0.1 * 0.001 = 0.0001
)
model.compile(loss='mean_squared_error', optimizer=tf.keras.optimizers.Adam(lr_schedule))

# 에포크별 학습 데이터 수집
total_epochs = 1000
history_data = []

# 예측용 x 범위 (-50 ~ 50)
x_range = np.linspace(-50, 50, 50)

for epoch in range(total_epochs):
    hist = model.fit(celsius_q, fahrenheit_a, epochs=1, verbose=0)
    weights = model.layers[0].get_weights()
    w = float(weights[0][0][0])
    b = float(weights[1][0])
    loss = float(hist.history['loss'][0])

    # 데이터 포인트에 대한 예측값
    predictions = model.predict(celsius_q, verbose=0).flatten().tolist()

    # 라인 예측값
    line_predictions = model.predict(x_range, verbose=0).flatten().tolist()

    record = {
        "epoch": epoch + 1,
        "weight": round(w, 6),
        "bias": round(b, 6),
        "loss": round(loss, 6),
        "predictions": [round(p, 2) for p in predictions],
        "line_x": [round(x, 2) for x in x_range.tolist()],
        "line_y": [round(y, 2) for y in line_predictions],
    }
    history_data.append(record)

    if (epoch + 1) % 100 == 0:
        print(f"Epoch {epoch+1}/{total_epochs} - Loss: {loss:.6f}, W: {w:.4f}, B: {b:.4f}")

output = {
    "celsius": celsius_q.tolist(),
    "fahrenheit": fahrenheit_a.tolist(),
    "history": history_data,
}

with open("training_history.json", "w") as f:
    json.dump(output, f)

print(f"\n최종 Weight: {w:.6f} (목표 1.8)")
print(f"최종 Bias:   {b:.6f} (목표 32.0)")
print(f"최종 Loss:   {loss:.6f}")
print(f"\n학습 데이터를 training_history.json에 저장했습니다. ({len(history_data)} epochs)")
