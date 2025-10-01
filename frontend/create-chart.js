//import { dataSet } from "./analyse-page.js";
import { test_set } from './test_set.js';
const indexes = test_set.map((_, i) => i);
const values = test_set.map(item => item[0]);

new Chart("resultChart", {
  type: "line",
  data: {
    labels: indexes,
    datasets: [{
      backgroundColor:"rgba(0,0,255,1.0)",
      borderColor: "rgba(0,0,255,0.1)",
      data: values
    }]
  },
  options: {}
});