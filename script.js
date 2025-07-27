const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

let cities = [];

// Carrega os dados da planilha
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
    populateDatalist(); // Preenche o autocomplete
    initMap(); // Inicia o mapa
  })
  .catch(err => console.error("Erro ao carregar dados:", err));

// Preenche o datalist com todas as cidades
function populateDatalist() {
  const datalist = document.getElementById("cityList");
  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city.nome;
    datalist.appendChild(option);
  });
}

// Verifica se a cidade foi desenhada
function checkCity() {
  const input = document.getElementById("cityInput").value.trim();
  const resultDiv = document.getElementById("result");
  
  if (!input) {
    resultDiv.innerHTML = "Digite o nome de uma cidade.";
    return;
  }

  const found = cities.find(city => 
    city.nome.toLowerCase() === input.toLowerCase()
  );

  if (found) {
    if (found.desenhada === "Sim") {
      resultDiv.innerHTML = `✅ Já desenhei <strong>${found.nome}</strong>! <br><a href="${found.link}" target="_blank">Ver desenho</a>`;
    } else {
      resultDiv.innerHTML = `❌ Ainda não desenhei <strong>${found.nome}</strong>.`;
    }
  } else {
    resultDiv.innerHTML = "Cidade não encontrada. Verifique o nome!";
  }
}

// Inicia o mapa com marcadores
function initMap() {
  const map = L.map("map").setView([-30.0, -53.0], 6);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Adiciona marcadores apenas para cidades desenhadas
  cities.forEach(city => {
    if (city.desenhada === "Sim") {
      fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city.nome)}&state=RS&country=Brazil&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            L.marker([lat, lon]).addTo(map)
              .bindPopup(`<b>${city.nome}</b><br><a href="${city.link}" target="_blank">Ver desenho</a>`);
          }
        })
        .catch(err => console.error(`Erro ao buscar coordenadas de ${city.nome}:`, err));
    }
  });
}
