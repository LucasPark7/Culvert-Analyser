async function uploadVideo() {
    const fileInput = document.getElementById("videoFile");
    const loading = document.getElementById("loadingText");
    const result = document.getElementById("result");

    if (fileInput.files.length === 0) {
    alert("Please select a video file first!");
    return;
    }

    if (fileInput.files[0].size > 200 * 1024 * 1024) {
      alert(`File too large! Reduce size and try again`);
      return;
    }

    loading.style.display = "block";
    result.textContent = "";

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

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
    result.innerText = "Done: " + JSON.stringify(data);

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
            
            new Chart("resultChart", {
            type: "line",
            data: {
                labels: frames,
                datasets: [{
                backgroundColor:"rgba(0,0,255,1.0)",
                borderColor: "rgba(0,0,255,0.1)",
                data: values
                }]
            },
            options: {}
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