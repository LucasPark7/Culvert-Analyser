const fileInput = document.getElementById("videoFile");
const inputButton = document.getElementById("uploadButton")
const loading = document.getElementById("loadingText");
const result = document.getElementById("result");
const ctx = document.getElementById("resultChart");
const resolution = document.getElementById("resoSelect")

let chartInstance = null;
var process_flag = false;
var list_runs = [];

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

const labelList = Array.from({ length: 120 }, (_, i) => i + 1);

chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labelList,
        datasets: [
            //{ label: 'Culvert Score', borderWidth: 1 }
        ]
    },
    options: {
        scales: {
            y: {
            beginAtZero: true
            }
        }
    }
});

// sample culvert for testing
var test_culvert = { frames: [1, 2, 3, 4, 5], values: [5, 25, 50, 100, 150], fatal_list: [false, false, true, true, false] };
list_runs.push(test_culvert);
const fatal = (ctx, value) => test_culvert.fatal_list[ctx.p0DataIndex] ? value : undefined;

chartInstance.data.labels = test_culvert.frames;
chartInstance.data.datasets.push({
    label: "Culvert #" + list_runs.length,
    data: test_culvert.values,
    borderColor: "rgb(255, 255, 255)",
    backgroundColor: "rgba(20, 179, 228, 1)",
    fill: false,
    segment: { borderColor: ctx => fatal(ctx, 'rgb(192,75,75)') },
    spanGaps: true
});
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

        // declare new culvert object to store data
        var new_culvert = { frames: [0], values: [], fatal_list: [] };
        list_runs.push(new_culvert);

        // consider arr of 0-120 for fixed label set
        chartInstance.data.labels = new_culvert.frames;
        chartInstance.data.datasets.push({
            label: "Culvert #" + list_runs.length,
            data: new_culvert.values,
            borderColor: "rgba(255, 255, 255, 0.53)",
            backgroundColor: "rgba(20, 179, 228, 1)",
            fill: false
        });

        const interval = setInterval(async () => {
            const statusResp = await fetch(`https://culvert-analyse.onrender.com/status/${data.job_id}`);
            const statusData = await statusResp.json();

            var dataSet = JSON.stringify(statusData.results, null, 2);
            dataSet = JSON.parse(dataSet);
            dataSet.forEach(function (value, index) {
                // if frame isn't in dataset yet then we can push, otherwise ignore
                if ((index + 1) > new_culvert.frames[new_culvert.frames.length - 1]) {
                    new_culvert.frames.push(index + 1);
                    new_culvert.values.push(value[0]);
                    new_culvert.fatal_list.push(value[1]);
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