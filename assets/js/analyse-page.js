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
        pointStyle: false,
        datasets: []
    },
    options: {
        fill: false,
        responsive: true,
        interaction: {
            intersect: false
        },
        radius: 0,
        plugins: {
            title: {
                display: true,
                text: 'Culvert Score'
            }
        }
    }
    });

chartInstance.data.labels = [0, 1, 2, 3, 4];
chartInstance.data.datasets.push({
    label: "test",
    data: [1000, 2000, 4000, 8000, 15000],
    borderColor: "rgba(255, 255, 255, 0.53)",
    backgroundColor: "rgba(20, 179, 228, 1)",
    fill: false
});

//chartInstance.data.datasets.pop();
chartInstance.update();

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

        var frames = [];
        var values = [];
        var fatal_list = [];

        chartInstance.data.labels = frames;
        chartInstance.data.datasets.push({
            label: "test",
            data: values,
            borderColor: "rgba(255, 255, 255, 0.53)",
            backgroundColor: "rgba(20, 179, 228, 1)",
            fill: false
        });

        const interval = setInterval(async () => {
            const statusResp = await fetch(`https://culvert-analyse.onrender.com/status/${data.job_id}`);
            const statusData = await statusResp.json();

            var dataSet = JSON.stringify(statusData.results, null, 2);
            dataSet = JSON.parse(dataSet);
            //result.innerHTML = dataSet;
            dataSet.forEach(function (value, index) {
                // if frame isn't in dataset yet then we can push, otherwise ignore
                if ((index + 1) > frames[frames.length - 1]) {
                    frames.push(index + 1);
                    values.push(value[0]);
                    fatal_list.push(value[1]);
                }
            });

            chartInstance.update();

            if (statusData.status === "complete") {
                clearInterval(interval);      
                result.innerHTML = "Processing complete!";
                process_flag = false;
            }

            // timeout
            if (Date.now() - startTime > maxTime) {
                clearInterval(interval);
                loading.innerHTML = "process timeout error";
                process_flag = false;
                return;
            }
        }, 3000); // poll every 3 seconds
    } catch (err) {
        loading.style.display = "none";
        result.innerText = "Error: " + err;
    } finally {
        loading.style.display = "none";
    }
}