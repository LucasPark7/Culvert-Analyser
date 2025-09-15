import socket
import time
import statistics
import threading

# ----- CONFIG -----
SERVERS = {
    "Channel 1" : ("35.155.204.207", 8585),       # Example DNS (replace with MapleStory server IP:port)
    "Channel 2" : ("52.26.82.74", 8585),
    "Channel 3" : ("34.217.205.66", 8585),
    "Channel 4" : ("35.161.183.101", 8585),
    "Channel 5" : ("54.218.157.183", 8585)
    # ("203.xxx.xxx.xxx", 8585),  # Add actual MapleStory servers here
}
INTERVAL = 1.0   # seconds between probes per server
TIMEOUT = 1.5    # socket timeout (s)
WINDOW = 20      # rolling window size for avg/stddev
# -------------------

def tcp_connect_time(host: str, port: int, timeout: float = TIMEOUT) -> float | None:
    """Attempt to open TCP connection and return elapsed time in ms, or None if failed."""
    start = time.time()
    try:
        s = socket.create_connection((host, port), timeout)
        s.close()
        return (time.time() - start) * 1000.0  # ms
    except Exception:
        return None

def monitor_server(host: str, port: int, channel:str,  interval: float, window: int):
    latencies = []
    while True:
        latency = tcp_connect_time(host, port)
        timestamp = time.strftime("%H:%M:%S")
        
        if latency is not None:
            latencies.append(latency)
            if len(latencies) > window:
                latencies.pop(0)  # keep rolling window
            avg = statistics.mean(latencies)
            jitter = statistics.pstdev(latencies) if len(latencies) > 1 else 0.0
            print(f"[{timestamp}] {channel} | {latency:.1f} ms | "
                  f"avg={avg:.1f} ms | jitter={jitter:.1f} ms | loss=0")
        else:
            print(f"[{timestamp}] {channel} | TIMEOUT | loss=1")
        
        time.sleep(interval)

if __name__ == "__main__":
    threads = []
    for channel in SERVERS:
        host_port = SERVERS[channel]
        host = host_port[0]
        port = host_port[1]
        t = threading.Thread(target=monitor_server, args=(host, port, channel, INTERVAL, WINDOW), daemon=True)
        t.start()
        threads.append(t)
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped monitoring.")
