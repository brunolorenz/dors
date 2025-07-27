const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// Cache de coordenadas para cidades do RS
const coordenadasRS = {
  "Porto Alegre": { lat: -30.0331, lng: -51.23 },
  "Caxias do Sul": { lat: -29.168, lng: -51.1798 },
  "Pelotas": { lat: -31.7619, lng: -52.3378 },
  // Adicione mais cidades conforme necessário
};

let cities = [];
let map;

// Carrega os dados da planilha
document.addEventListener('DOMContentLoaded', () => {
  fetch(url)
    .then(res => res.text())
    .then(rep => {
      const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
      cities = jsonData.table.rows.map(row => ({
        nome: row.c[0]?.v || '',
        desenhada: row.c[1]?.v || 'Não',
        link: row.c[2]?.v || '#'
      }));
      
      setupAutocomplete();
      initMap();
      addMarkersToMap();
    })
    .catch(err => {
      console.error("Erro ao carregar dados:", err);
      document.getElementById("result").innerHTML = 
        "⚠️ Erro ao carregar dados. Recarregue a página.";
      document.getElementById("result").className = "error";
    });
});

// Configura o autocomplete com filtro por início do texto
function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const datalist = document.getElementById("cityList");

  input.addEventListener('input', () => {
    const searchTerm = input.value.trim().toLowerCase();
    datalist.innerHTML = '';

    if (searchTerm.length === 0) return;

    // Filtro corrigido (startsWith) + apenas cidades do RS
    const filteredCities = cities.filter(city => 
      city.nome.toLowerCase().startsWith(searchTerm) && 
      city.estado === 'RS' // Adicione uma coluna "estado" na sua planilha
    );

    // Ordenação alfabética
    filteredCities.sort((a, b) => a.nome.localeCompare(b.nome));

    filteredCities.slice(0, 20).forEach(city => {
      const option = document.createElement("option");
      option.value = city.nome;
      datalist.appendChild(option);
    });
  });
}

// Inicializa o mapa
function initMap() {
  map = L.map('map').setView([-30.5, -53.2], 6.4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Adiciona marcadores para cidades desenhadas
function addMarkersToMap() {
  const drawnCities = cities.filter(city => city.desenhada === "Sim");
  
  drawnCities.forEach(city => {
    const coords = coordenadasRS[city.nome];
    if (coords) {
      const marker = L.marker([coords.lat, coords.lng]).addTo(map);
      marker.bindPopup(`
        <b>${city.nome}</b><br>
        <a href="${city.link}" target="_blank">Ver desenho</a>
      `);
    }
  });
}

// Função de busca
function checkCity() {
  const input = document.getElementById("cityInput");
  const cityName = input.value.trim();
  const resultDiv = document.getElementById("result");

  if (!cityName) {
    resultDiv.innerHTML = "Por favor, digite o nome de uma cidade.";
    resultDiv.className = "error";
    return;
  }

  const foundCity = cities.find(c => 
    c.nome.toLowerCase() === cityName.toLowerCase()
  );

  if (foundCity) {
    if (foundCity.desenhada === "Sim") {
      resultDiv.innerHTML = `✅ <strong>${foundCity.nome}</strong> já foi desenhada!<br>
                            <a href="${foundCity.link}" target="_blank">Ver desenho</a>`;
      resultDiv.className = "success";
      
      // Centraliza no mapa se existir coordenada
      const coords = coordenadasRS[foundCity.nome];
      if (coords) {
        map.setView([coords.lat, coords.lng], 12);
      }
    } else {
      resultDiv.innerHTML = `✏️ <strong>${foundCity.nome}</strong> ainda não foi desenhada.`;
      resultDiv.className = "warning";
    }
  } else {
    resultDiv.innerHTML = `❌ Cidade não encontrada. Verifique o nome.`;
    resultDiv.className = "error";
  }
}
