let statsTableBody;

beforeEach(() => {
  // Create a mock table body with insertRow functionality
  statsTableBody = {
    rows: [],
    insertRow: function(index) {
      const row = {
        cells: [],
        insertCell: function(cellIndex) {
          const cell = { textContent: '' };
          this.cells[cellIndex] = cell;
          return cell;
        }
      };
      if (index === -1) {
        this.rows.push(row);
      } else {
        this.rows.splice(index, 0, row);
      }
      return row;
    }
  };
    // Make it globally available like it would be in the browser
  global.statsTableBody = statsTableBody;
});

function addStatRow(fatalStart, fatalEnd, fatalGain, totalScore) {
    const scorePerS = (fatalGain / (fatalEnd - fatalStart));
    const percentScore = (fatalGain / totalScore) * 100;

    var newRow = statsTableBody.insertRow(-1);

    const timeCell      = newRow.insertCell(0);
    const gainCell      = newRow.insertCell(1);
    const percentCell   = newRow.insertCell(2);
    const perSecondCell = newRow.insertCell(3);

    timeCell.textContent      = fatalStart.toString() + 's - ' + fatalEnd.toString() + 's';
    gainCell.textContent      = fatalGain.toString();
    percentCell.textContent   = percentScore.toFixed(3).toString() + '%';
    perSecondCell.textContent = scorePerS.toFixed(3).toString();
}

function computeStats(culvert_data) {
    const totalScore = culvert_data.values[culvert_data.frames.length - 1];
    // flag var to track fatal cycles
    var openFatal = false;
    var fatalStart = 0;
    var fatalEnd = 0;
    var fatalGain = 0;
    for (let i = 0; i < culvert_data.frames.length; i++) {
        // once new fatal is detected, start compiling data
        if (openFatal == false && culvert_data.fatal_list[i] == true) {
            fatalStart = culvert_data.frames[i];
            fatalGain = culvert_data.values[i];
            openFatal = true;
        }
        else if (openFatal == true && culvert_data.fatal_list[i] == true) {
            fatalGain += culvert_data.values[i];
        }
        else if (openFatal == true && culvert_data.fatal_list[i] == false) {
            fatalEnd = culvert_data.frames[i];
            openFatal = false;
            //console.log("Start " + fatalStart + " End " + fatalEnd + " Gain " + fatalGain);
            addStatRow(fatalStart, fatalEnd, fatalGain, totalScore);
        }
    }
    // edge case if last frame is part of fatal
    if (openFatal == true) {
        fatalEnd = culvert_data.frames[culvert_data.frames.length - 1];
        //console.log("Start " + fatalStart + " End " + fatalEnd + " Gain " + fatalGain);
        addStatRow(fatalStart, fatalEnd, fatalGain, totalScore);
    }
}

describe('addStatRow', () => {
  test('correctly calculates and formats score per second', () => {
    addStatRow(10, 20, 50, 1000);
    
    const row = statsTableBody.rows[0];
    expect(row.cells[3].textContent).toBe('5.000'); // 50 / (20-10) = 5.000
  });

  test('correctly calculates and formats percentage', () => {
    addStatRow(10, 20, 250, 1000);
    
    const row = statsTableBody.rows[0];
    expect(row.cells[2].textContent).toBe('25.000%'); // (250/1000) * 100 = 25%
  });

  test('correctly formats time range', () => {
    addStatRow(15, 45, 100, 1000);
    
    const row = statsTableBody.rows[0];
    expect(row.cells[0].textContent).toBe('15s - 45s');
  });

  test('correctly displays gain value', () => {
    addStatRow(10, 20, 75, 1000);
    
    const row = statsTableBody.rows[0];
    expect(row.cells[1].textContent).toBe('75');
  });

  test('adds row to table', () => {
    expect(statsTableBody.rows.length).toBe(0);
    addStatRow(10, 20, 50, 1000);
    expect(statsTableBody.rows.length).toBe(1);
  });

  test('handles decimal calculations correctly', () => {
    addStatRow(10, 13, 7, 100);
    
    const row = statsTableBody.rows[0];
    expect(row.cells[3].textContent).toBe('2.333'); // 7/3 = 2.333...
    expect(row.cells[2].textContent).toBe('7.000%'); // 7/100 = 7%
  });
});

describe('computeStats', () => {
  test('processes single fatal period correctly', () => {
    const culvert_data = {
      frames: [0, 1, 2, 3, 4, 5],
      values: [0, 10, 20, 30, 40, 100],
      fatal_list: [false, true, true, true, false, false]
    };

    computeStats(culvert_data);

    expect(statsTableBody.rows.length).toBe(1);
    const row = statsTableBody.rows[0];
    expect(row.cells[0].textContent).toBe('1s - 4s'); // starts at frame 1, ends at frame 4
    expect(row.cells[1].textContent).toBe('60'); // 10 + 20 + 30
  });

  test('processes multiple fatal periods', () => {
    const culvert_data = {
      frames: [0, 1, 2, 3, 4, 5, 6],
      values: [0, 10, 20, 30, 40, 50, 100],
      fatal_list: [false, true, true, false, true, true, false]
    };

    computeStats(culvert_data);

    expect(statsTableBody.rows.length).toBe(2);
    
    // First fatal period (frames 1-2)
    expect(statsTableBody.rows[0].cells[0].textContent).toBe('1s - 3s');
    expect(statsTableBody.rows[0].cells[1].textContent).toBe('30'); // 10 + 20
    
    // Second fatal period (frames 4-5)
    expect(statsTableBody.rows[1].cells[0].textContent).toBe('4s - 6s');
    expect(statsTableBody.rows[1].cells[1].textContent).toBe('90'); // 40 + 50
  });

  test('handles edge case when fatal period extends to end', () => {
    const culvert_data = {
      frames: [0, 1, 2, 3, 4],
      values: [0, 10, 20, 30, 100],
      fatal_list: [false, false, true, true, true]
    };

    computeStats(culvert_data);

    expect(statsTableBody.rows.length).toBe(1);
    expect(statsTableBody.rows[0].cells[0].textContent).toBe('2s - 4s');
    expect(statsTableBody.rows[0].cells[1].textContent).toBe('150'); // 20 + 30 + 100 (values at indices 2,3,4)
  });

  test('handles no fatal periods', () => {
    const culvert_data = {
      frames: [0, 1, 2, 3],
      values: [0, 10, 20, 100],
      fatal_list: [false, false, false, false]
    };

    computeStats(culvert_data);

    expect(statsTableBody.rows.length).toBe(0);
  });

  test('handles all fatal periods', () => {
    const culvert_data = {
      frames: [0, 1, 2, 3],
      values: [0, 10, 20, 100],
      fatal_list: [true, true, true, true]
    };

    computeStats(culvert_data);

    expect(statsTableBody.rows.length).toBe(1);
    expect(statsTableBody.rows[0].cells[0].textContent).toBe('0s - 3s');
    expect(statsTableBody.rows[0].cells[1].textContent).toBe('130'); // 0 + 10 + 20 + 100
  });

  test('correctly uses total score from last value', () => {
    const culvert_data = {
      frames: [0, 1, 2],
      values: [0, 50, 200], // totalScore should be 200
      fatal_list: [false, true, false]
    };

    computeStats(culvert_data);

    const row = statsTableBody.rows[0];
    expect(row.cells[2].textContent).toBe('25.000%'); // 50/200 * 100 = 25%
  });
});