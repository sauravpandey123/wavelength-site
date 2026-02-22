const dataTag = document.getElementById("survey-data");
if (dataTag) {
  const summary = JSON.parse(dataTag.textContent);
  const statElements = document.querySelectorAll("[data-stat]");

  statElements.forEach((el) => {
    const key = el.getAttribute("data-stat");
    const format = el.getAttribute("data-stat-format");
    if (!key || !(key in summary)) {
      return;
    }
    const value = summary[key];
    if (format === "percent") {
      el.textContent = `${value}%`;
    } else {
      el.textContent = value;
    }
  });

  const insightLine = (item) => (item ? `${item.pct}% said: ${item.label}` : "");

  const insights = {
    top_blocker: insightLine(summary.top_barriers?.[0]),
    top_factor: insightLine(summary.top_match_factors?.[0]),
    top_activity: insightLine(summary.top_activities?.[0]),
    try_top2: "",
  };

  document.querySelectorAll("[data-insight]").forEach((el) => {
    const key = el.getAttribute("data-insight");
    if (key && insights[key]) {
      el.textContent = insights[key];
    }
  });

  if (window.Chart) {
    const solidBackground = {
      id: "solidBackground",
      beforeDraw: (chart, _args, opts) => {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = opts && opts.color ? opts.color : "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      },
    };

    Chart.register(solidBackground);
    Chart.defaults.font.family = "Sora, system-ui, sans-serif";
    Chart.defaults.color = "#5f6270";
    Chart.defaults.borderColor = "rgba(27, 28, 35, 0.08)";
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.animation = false;
    Chart.defaults.responsive = false;

    const palette = {
      teal: "#1f7a8c",
      coral: "#ff7a59",
      gold: "#f9c74f",
      sage: "#43aa8b",
      plum: "#9b5de5",
      navy: "#577590",
    };

    const wrapLabel = (label, max = 20) => {
      if (label.length <= max) return label;
      const words = label.split(" ");
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (next.length > max) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      return lines;
    };

    const freezeChart = (chart) => {
      const img = document.createElement("img");
      img.src = chart.toBase64Image();
      img.alt = chart.canvas.getAttribute("aria-label") || "Chart";
      img.className = "chart-img";
      chart.canvas.replaceWith(img);
      chart.destroy();
    };

    const prepCanvas = (canvas, width = 620, height = 320) => {
      canvas.width = width;
      canvas.height = height;
    };

    const createChart = (canvas, config, size = {}) => {
      prepCanvas(canvas, size.width, size.height);
      const chart = new Chart(canvas, config);
      requestAnimationFrame(() => freezeChart(chart));
    };

    const labelMap = {
      "Friends are busy or unavailable": "Friends are busy",
      "Too tired to coordinate/ Text around": "Too tired to coordinate",
      "I'd rather be alone (just don't feel like it)": "Rather be alone",
      "Don't know who would be down for what I want to do": "Don't know who's down",
      "Feels awkward to reach out": "Awkward to reach out",
      "Don't want to bother my friends": "Don't want to bother",
      "They have a similar energy/mood": "Similar energy/mood",
      "They have similar interests/hobbies": "Similar interests",
      "They want to do the same activity as me": "Same activity",
      "They're nearby/ convenient to meet": "Nearby",
      "They're the same age": "Same age",
      "They're the same gender": "Same gender",
      "Get food / coffee": "Food / coffee",
      "Study together": "Study",
      "Play games (board games, video games, etc)": "Play games",
      "Just chill/ hang out": "Chill / hang out",
      "Explore campus / neighborhood/city": "Explore campus",
      "Work out / exercise": "Work out",
    };

    const mapItems = (items) =>
      items.map((item) => ({
        ...item,
        label: labelMap[item.label] || item.label,
      }));

    const buildBarPercent = (id, items, horizontal = false, color = palette.teal) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;
      const mapped = mapItems(items);
      const labels = mapped.map((item) => item.label);
      createChart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              data: mapped.map((item) => item.pct),
              backgroundColor: color,
              borderRadius: 10,
              barThickness: horizontal ? 22 : 32,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          indexAxis: horizontal ? "y" : "x",
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: "rgba(27, 28, 35, 0.05)" },
              ticks: {
                callback: (value, index) => {
                  if (horizontal) {
                    return `${value}%`;
                  }
                  const label = labels[index] || value;
                  return wrapLabel(label);
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: { display: false },
              ticks: {
                callback: (value, index) => {
                  if (!horizontal) {
                    return `${value}%`;
                  }
                  const label = labels[index] || value;
                  return wrapLabel(label);
                },
              },
            },
          },
          plugins: {
            solidBackground: { color: "#ffffff" },
          },
        },
      });
    };

    const buildBarCounts = (id, items, color = palette.gold) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;
      const labels = items.map((item) => item.label);
      createChart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              data: items.map((item) => item.value),
              backgroundColor: color,
              borderRadius: 10,
              barThickness: 28,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                callback: (value, index) => wrapLabel(labels[index] || value),
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(27, 28, 35, 0.05)" },
            },
          },
          plugins: {
            solidBackground: { color: "#ffffff" },
          },
        },
      });
    };

    const buildLikelihoodPie = (id, counts) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;

      const labels = ["Unlikely", "Open to trying (3)", "Highly Likely (4-5)"];
      const values = [counts.notLikely, counts.neutral, counts.likely];
      createChart(
        ctx,
        {
          type: "pie",
          data: {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: [palette.navy, palette.gold, palette.coral],
                borderColor: "#ffffff",
                borderWidth: 4,
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  usePointStyle: true,
                  pointStyle: "circle",
                  boxWidth: 12,
                  padding: 18,
                  font: { size: 13, weight: "600" },
                },
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = Number(context.raw) || 0;
                    return `${context.label}: ${value} responses`;
                  },
                },
              },
              solidBackground: { color: "#ffffff" },
            },
          },
        },
        { width: 620, height: 360 }
      );
    };

    buildBarPercent("chart-barriers", summary.top_barriers, true, palette.teal);
    buildBarPercent("chart-factors", summary.top_match_factors, true, palette.sage);
    buildBarPercent("chart-activities", summary.top_activities, true, palette.coral);

    const tryDistribution = summary.try_distribution || {};
    const likelihoodGroups = {
      notLikely: (tryDistribution["1"] || 0) + (tryDistribution["2"] || 0),
      neutral: tryDistribution["3"] || 0,
      likely: (tryDistribution["4"] || 0) + (tryDistribution["5"] || 0),
    };

    buildLikelihoodPie("chart-likelihood", likelihoodGroups);
  }
}
