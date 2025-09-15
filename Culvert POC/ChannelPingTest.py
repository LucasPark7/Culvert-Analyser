import socket, time, statistics

def tcp_ping(host, port, timeout=1):
    try:
        start = time.time()
        s = socket.create_connection((host, port), timeout)
        s.close()
        return (time.time() - start) * 1000  # ms
    except:
        return None

def test_server(host, port, trials=50, delay=1):
    latencies = []
    drops = 0
    for _ in range(trials):
        latency = tcp_ping(host, port)
        if latency is None:
            drops += 1
        else:
            latencies.append(latency)
        time.sleep(delay)

    if latencies:
        return {
            "avg": sum(latencies)/len(latencies),
            "jitter": statistics.pstdev(latencies),
            "loss": drops / trials * 100,
        }
    else:
        return {"avg": None, "jitter": None, "loss": 100}

if __name__ == "__main__":
    # Example test
    servers = [("54.148.188.235", 8585)]
    for ip, port in servers:
        stats = test_server(ip, port)
        print(ip, stats)