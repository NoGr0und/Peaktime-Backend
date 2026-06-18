import serial
import requests

# Configurações
PORTA_ARDUINO = "COM6"
BAUD_RATE = 9600
URL_API = "http://localhost:3333/api/occupancy/hardware"

try:
    arduino = serial.Serial(PORTA_ARDUINO, BAUD_RATE, timeout=1)

    print("=" * 50)
    print("PeakTime Hardware Bridge")
    print("Aguardando eventos...")
    print("=" * 50)

    while True:
        try:
            linha = arduino.readline().decode("utf-8").strip()

            if not linha:
                continue

            # Ignora mensagens de debug do Arduino
            if linha.startswith("Pessoas na Academia"):
                continue

            if linha == "vazio!":
                print("Tentativa de saída com academia vazia")
                continue

            # Entrada
            if linha == "IN":

                resposta = requests.post(
                    URL_API,
                    json={"change": 1}
                )

                if resposta.status_code == 200:
                    dados = resposta.json()

                    print(
                        f"ENTRADA REGISTRADA | Lotação atual: {dados['newOccupancy']}"
                    )
                else:
                    print(
                        f"ERRO API: {resposta.status_code}"
                    )

            # Saída
            elif linha == "OUT":

                resposta = requests.post(
                    URL_API,
                    json={"change": -1}
                )

                if resposta.status_code == 200:
                    dados = resposta.json()

                    print(
                        f"SAÍDA REGISTRADA | Lotação atual: {dados['newOccupancy']}"
                    )
                else:
                    print(
                        f"ERRO API: {resposta.status_code}"
                    )

        except Exception as erro:
            print(f"Erro ao processar evento: {erro}")

except Exception as erro:
    print(f"Erro ao abrir COM6: {erro}")