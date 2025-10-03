let chartInstance = null;

async function uploadVideo() {
    const fileInput = document.getElementById("videoFile");
    const loading = document.getElementById("loadingText");
    const result = document.getElementById("result");
    const ctx = document.getElementById("resultChart");

    var file = fileInput.files[0];

    if (fileInput.files.length === 0) {
    alert("Please select a video file first!");
    return;
    }

    if (file.size > (200 * 1024 * 1024)) {
      alert(`File too large! Reduce size and try again`);
      file = "";
      return;
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    loading.style.display = "block";
    result.textContent = "";

    const formData = new FormData();
    formData.append("file", file);

    loading.style.display = "block";
    result.innerText = "";

    try {
    const response = await fetch("https://culvert-analyse.onrender.com/analyse", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    loading.style.display = "none";
    result.innerText = JSON.stringify(data.status);

    const maxTime = 600 * 1000;
    const startTime = Date.now();

    const interval = setInterval(async () => {
        const statusResp = await fetch(`https://culvert-analyse.onrender.com/status/${data.job_id}`);
        const statusData = await statusResp.json();

        if (statusData.status === "complete") {
            clearInterval(interval);      
            loading.innerHTML = "Processing complete!";
            var dataSet = JSON.stringify(statusData.results, null, 2);
            dataSet = JSON.parse(dataSet);
            //result.innerHTML = dataSet;
            var frames = [];
            var values = [];
            var fatal_list = [];
            dataSet.forEach(function (value, index) {
                frames.push(index + 1);
                values.push(value[0]);
                fatal_list.push(value[1]);
            });
            
            chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: frames,
                pointStyle: false,
                datasets: [{
                label: "Culvert Score",
                backgroundColor:"rgba(0,0,255,1.0)",
                borderColor: "rgba(0,0,255,0.1)",
                data: values
                }]
            },
            options: {
                fill: false,
                interaction: {
                    intersect: false
                },
                radius: 0,
            }
            });
        } else {
        loading.innerHTML = `Processing... (${statusData.progress || "pending"})`;
        }

        // timeout
        if (Date.now() - startTime > maxTime) {
        clearInterval(interval);
        loading.innerHTML = "process timeout error";
        return;
        }
    }, 10000); // poll every 10 seconds
    } catch (err) {
    loading.style.display = "none";
    result.innerText = "Error: " + err;
    } finally {
    loading.style.display = "none";
    }
}