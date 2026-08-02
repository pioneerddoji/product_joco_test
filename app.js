(function () {
    var root = document.documentElement;
    var themeButtons = document.querySelectorAll("[data-theme-toggle]");

    function updateThemeButtons() {
        var isDark = root.dataset.theme === "dark";
        themeButtons.forEach(function (button) {
            button.textContent = isDark ? "☀️" : "🌙";
            button.setAttribute("aria-label", isDark ? "화이트 모드로 전환" : "다크 모드로 전환");
            button.setAttribute("aria-pressed", String(isDark));
        });
    }

    themeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            var nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
            root.dataset.theme = nextTheme;
            localStorage.setItem("theme", nextTheme);
            updateThemeButtons();
        });
    });

    updateThemeButtons();

    document.querySelectorAll("[data-current-year]").forEach(function (element) {
        element.textContent = String(new Date().getFullYear());
    });

    function getColor(number) {
        if (number <= 10) return "yellow";
        if (number <= 20) return "blue";
        if (number <= 30) return "red";
        if (number <= 40) return "gray";
        return "green";
    }

    function generateSet() {
        var numbers = [];
        while (numbers.length < 6) {
            var number = Math.floor(Math.random() * 45) + 1;
            if (!numbers.includes(number)) numbers.push(number);
        }
        return numbers.sort(function (a, b) { return a - b; });
    }

    var generateButton = document.getElementById("generateButton");
    var results = document.getElementById("numbers");

    if (generateButton && results) {
        generateButton.addEventListener("click", function () {
            results.innerHTML = "";

            for (var index = 1; index <= 5; index += 1) {
                var row = document.createElement("div");
                row.className = "number-row";

                var label = document.createElement("div");
                label.className = "set-label";
                label.textContent = index + "조";
                row.appendChild(label);

                generateSet().forEach(function (number) {
                    var ball = document.createElement("div");
                    ball.className = "ball " + getColor(number);
                    ball.textContent = String(number);
                    row.appendChild(ball);
                });

                results.appendChild(row);
            }
        });
    }
})();
