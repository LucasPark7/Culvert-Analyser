let chartInstance = null;
const fileInput = document.getElementById("videoFile");
const inputButton = document.getElementById("uploadButton")
const loading = document.getElementById("loadingText");
const result = document.getElementById("result");
const ctx = document.getElementById("resultChart");
const resolution = document.getElementById("resoSelect")
var process_flag = false;

inputButton.addEventListener("click", () => {
        fileInput.click();
    });

fileInput.addEventListener("change", (event) => {
var file = event.target.files[0];
    if (file) {
        if (file.size > (200 * 1024 * 1024)) {
            alert("File too large! Reduce size to less than 200 MB");
            fileInput.value = "";
            inputButton.textContent = "Upload Video";
            return;
        }
        inputButton.textContent = `${file.name}`;
    }
});
chartInstance = new Chart(ctx, {
    type: "line",
    data: {
        labels: frames,
        pointStyle: false,
        datasets: [{
        label: "Culvert Score",
        backgroundColor:"rgba(20, 179, 228, 1)",
        borderColor: "rgba(0, 0, 255, 1)",
        data: []
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

async function uploadVideo() {
    if (process_flag) {
        alert("Video currently processing, please wait to try again.");
        return;
    }

    if (fileInput.files.length === 0) {
        alert("Please select a video file first!");
        return;
    }

    /*
    if (chartInstance) {
        chartInstance.destroy();
    }
    */
    file = fileInput.files[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("resolution", resolution.value);

    loading.style.display = "block";
    result.innerText = "";

    process_flag = true;

    try {
        const response = await fetch("https://culvert-analyse.onrender.com/analyse", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            process_flag = false;
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        loading.style.display = "none";
        if (JSON.stringify(data.status)) {
            result.innerText = "Upload successful, processing video..."
        }

        const maxTime = 600 * 1000;
        const startTime = Date.now();

        const interval = setInterval(async () => {
            const statusResp = await fetch(`https://culvert-analyse.onrender.com/status/${data.job_id}`);
            const statusData = await statusResp.json();

            if (statusData.status === "complete") {
                clearInterval(interval);      
                result.innerHTML = "Processing complete!";
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
                
                chartInstance.data.datasets.push({
                    label: "test",
                    data: values,
                    borderColor: "rgba(20, 179, 228, 1)",
                    backgroundColor: "rgba(0, 0, 255, 1)",
                });

                chartInstance.update();
                process_flag = false;
            }

            // timeout
            if (Date.now() - startTime > maxTime) {
                clearInterval(interval);
                loading.innerHTML = "process timeout error";
                process_flag = false;
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