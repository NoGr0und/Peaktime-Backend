#include <Servo.h>

Servo cancela;

// ================= PINOS =================
const byte BTN_SOMA  = 9;
const byte BTN_SUB   = 10;
const byte SERVO_PIN = 11;

// =========================================

int contador = 0;

// Estados anteriores
bool estadoAnteriorSoma = HIGH;
bool estadoAnteriorSub  = HIGH;

// Controle da cancela
bool cancelaAberta = false;
unsigned long tempoCancela = 0;

// =========================================

void setup() {

  Serial.begin(9600);

  pinMode(BTN_SOMA, INPUT_PULLUP);
  pinMode(BTN_SUB, INPUT_PULLUP);

  cancela.attach(SERVO_PIN);

  fecharCancela();

  mostrarNumero();
}

// =========================================

void loop() {

  verificarBotao(BTN_SOMA, estadoAnteriorSoma, 1);
  verificarBotao(BTN_SUB, estadoAnteriorSub, -1);

  controlarCancela();
}

// =========================================

void verificarBotao(byte pino, bool &estadoAnterior, int direcao) {

  bool estadoAtual = digitalRead(pino);

  // Detecta clique
  if (estadoAnterior == HIGH && estadoAtual == LOW) {

    delay(30); // debounce físico

    // Confirma clique
    if (digitalRead(pino) == LOW) {

      // ENTRADA
      if (direcao > 0) {

        contador++;

        Serial.println("IN");

        abrirCancela();

      }

      // SAÍDA
      else {

        if (contador > 0) {

          contador--;

          Serial.println("OUT");

          abrirCancela();

        } else {

          Serial.println("vazio!");
        }
      }

      // Espera soltar botão
      while (digitalRead(pino) == LOW);
    }
  }

  estadoAnterior = estadoAtual;
}

// =========================================

void mostrarNumero() {
  Serial.print("Pessoas na Academia: ");
  Serial.println(contador);
}
// =========================================

void abrirCancela() {

  cancela.write(90);

  cancelaAberta = true;

  tempoCancela = millis();
}

// =========================================

void fecharCancela() {

  cancela.write(0);

  cancelaAberta = false;
}

// =========================================

void controlarCancela() {

  if (cancelaAberta && millis() - tempoCancela >= 700) {

    fecharCancela();
  }
}
