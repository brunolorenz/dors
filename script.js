const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

let cities = [];

fetch(url)
  .then(res => res.text())
  .then(rep => {
    const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
    const data = jsonData.table.rows;
    data.forEach(row => {
      cities.push({
        nome: row.c[0]?.v,
        desenhada: row.c[1]?.v,
        link: row.c[2]?.v
      });
    });
    initMap(); // chama o mapa depois dos dados
  });

function checkCity() {
  const input = document.getElementById("cityInput").value.trim().toLowerCase();
  const resultDiv = document.getElementById("result");
  const found = cities.find(city => city.nome.toLowerCase() === input);
  if (found) {
    if (found.desenhada === "Sim") {
      resultDiv.innerHTML = `✅ Já desenhei ${found.nome}! <br><a href="${found.link}" target="_blank">Ver desenho</a>`;
    } else {
      resultDiv.innerHTML = `❌ Ainda não desenhei ${found.nome}.`;
    }
  } else {
    resultDiv.innerHTML = "Cidade não encontrada na base de dados.";
  }
}

function initMap() {
  const map = L.map("map").setView([-30.0, -53.0], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  cities.forEach(city => {
    if (city.desenhada === "Sim") {
      fetch(`https://nominatim.openstreetmap.org/search?city=${city.nome}&state=RS&country=Brazil&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            const lat = data[0].lat;
            const lon = data[0].lon;
            L.marker([lat, lon]).addTo(map)
              .bindPopup(`<b>${city.nome}</b><br><a href="${city.link}" target="_blank">Ver desenho</a>`);
          }
        });
    }
  });
}