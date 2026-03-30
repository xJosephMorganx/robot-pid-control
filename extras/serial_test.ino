// Archivo: serial_test.ino
// Uso: Prueba de comunicación serial con Flask
// Descripción:
// Este sketch se usa para validar recepción de comandos y visualización en LCD.

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2); // cambia a 0x3F si no funciona

void setup() {
  Serial.begin(115200);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Esperando...");
}

void loop() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data.length() > 0) {

      // Mostrar en serial (para debug)
      Serial.print("Recibido: ");
      Serial.println(data);

      // Mostrar en LCD
      lcd.clear();

      // Primera linea
      lcd.setCursor(0, 0);
      lcd.print(data.substring(0, 16));

      // Segunda linea (si es largo)
      lcd.setCursor(0, 1);
      if (data.length() > 16) {
        lcd.print(data.substring(16));
      }
    }
  }
}