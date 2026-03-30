#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <math.h>

#define MIN_PULSE_WIDTH 650
#define MAX_PULSE_WIDTH 2350
#define FREQUENCY 50

#define POT_SAMPLES 3
#define TARGET_DEADBAND_US 8   // ignorar cambios muy pequeños en microsegundos

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// ============================
// Estructura por articulación
// ============================
struct Joint {
  int servoNum;
  double currentPos;   // Posición virtual/comandada
  double targetPos;    // Referencia desde el potenciómetro
  double kp, ki, kd;
  double integral;
  double lastError;
  bool inverted;       // Para invertir el mapeo si hace falta
};

// {canalServo, current, target, kp, ki, kd, integral, lastError, inverted}
Joint base     = {15, 1500, 1500, 0.10, 0.0, 0.0, 0.0, 0.0, false};
Joint shoulder = {14, 1500, 1500, 0.10, 0.0, 0.0, 0.0, 0.0, false};
Joint elbow    = {13, 1500, 1500, 0.10, 0.0, 0.0, 0.0, 0.0, false};
Joint wrist    = {12, 1500, 1500, 0.10, 0.0, 0.0, 0.0, 0.0, true};   // invertido como el original

const int potBasePin     = A0;
const int potShoulderPin = A1;
const int potElbowPin    = A2;
const int potWristPin    = A3;

const int pinzaPin  = 10;
const int buttonPin = 13;

// ============================
// Convertir microsegundos a cuentas PCA9685
// ============================
int usToPCA(double microseconds) {
  return int(microseconds * 4096.0 / (1000000.0 / FREQUENCY));
}

// ============================
// Leer potenciómetro con promedio
// ============================
int readPotAverage(int analogPin) {
  long sum = 0;

  for (int i = 0; i < POT_SAMPLES; i++) {
    sum += analogRead(analogPin);
    delayMicroseconds(500);
  }

  return sum / POT_SAMPLES;
}

// ============================
// Leer potenciómetro y mapear a microsegundos
// ============================
double readPotMapped(int analogPin, bool inverted) {
  int potVal = readPotAverage(analogPin);

  if (inverted) {
    return map(potVal, 240, 800, MIN_PULSE_WIDTH, MAX_PULSE_WIDTH);
  } else {
    return map(potVal, 800, 240, MIN_PULSE_WIDTH, MAX_PULSE_WIDTH);
  }
}

// ============================
// Actualizar target con deadband
// ============================
void updateTargetFromPot(Joint &j, int analogPin) {
  double newTarget = readPotMapped(analogPin, j.inverted);

  if (fabs(newTarget - j.targetPos) >= TARGET_DEADBAND_US) {
    j.targetPos = newTarget;
  }
}

// ============================
// Inicializar articulación con lectura real del maestro
// ============================
void initJointFromPot(Joint &j, int analogPin) {
  double startPos = readPotMapped(analogPin, j.inverted);

  j.targetPos = startPos;
  j.currentPos = startPos;
  j.integral = 0.0;
  j.lastError = 0.0;

  pwm.setPWM(j.servoNum, 0, usToPCA(j.currentPos));
}

// ============================
// PID virtual
// ============================
void computePID(Joint &j) {
  double error = j.targetPos - j.currentPos;

  double P = j.kp * error;

  j.integral += error;
  j.integral = constrain(j.integral, -100, 100);
  double I = j.ki * j.integral;

  double D = j.kd * (error - j.lastError);
  j.lastError = error;

  j.currentPos += (P + I + D);
  j.currentPos = constrain(j.currentPos, MIN_PULSE_WIDTH, MAX_PULSE_WIDTH);

  pwm.setPWM(j.servoNum, 0, usToPCA(j.currentPos));
}

// ============================
// Leer PID por serial
// ============================
void parseSerialPID() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data.length() < 7) return;

    char charBuf[40];
    data.toCharArray(charBuf, sizeof(charBuf));

    char* id = strtok(charBuf, ",");
    char* pStr = strtok(NULL, ",");
    char* iStr = strtok(NULL, ",");
    char* dStr = strtok(NULL, ",");

    if (id == NULL || pStr == NULL || iStr == NULL || dStr == NULL) return;

    double p = atof(pStr);
    double i = atof(iStr);
    double d = atof(dStr);

    if (id[0] == 'B') {
      base.kp = p; base.ki = i; base.kd = d;
    }
    else if (id[0] == 'S') {
      shoulder.kp = p; shoulder.ki = i; shoulder.kd = d;
    }
    else if (id[0] == 'E') {
      elbow.kp = p; elbow.ki = i; elbow.kd = d;
    }
    else if (id[0] == 'W') {
      wrist.kp = p; wrist.ki = i; wrist.kd = d;
    }
  }
}

void setup() {
  delay(5000);

  pwm.begin();
  pwm.setPWMFreq(FREQUENCY);

  pinMode(buttonPin, INPUT_PULLUP);
  Serial.begin(115200);

  pwm.setPWM(pinzaPin, 0, 90);

  initJointFromPot(base, potBasePin);
  initJointFromPot(shoulder, potShoulderPin);
  initJointFromPot(elbow, potElbowPin);
  initJointFromPot(wrist, potWristPin);
}

void loop() {
  updateTargetFromPot(base, potBasePin);
  updateTargetFromPot(shoulder, potShoulderPin);
  updateTargetFromPot(elbow, potElbowPin);
  updateTargetFromPot(wrist, potWristPin);

  parseSerialPID();

  computePID(base);
  computePID(shoulder);
  computePID(elbow);
  computePID(wrist);

  if (digitalRead(buttonPin) == LOW) {
    pwm.setPWM(pinzaPin, 0, 180);
  } else {
    pwm.setPWM(pinzaPin, 0, 90);
  }

  delay(10);
}
