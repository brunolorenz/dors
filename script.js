const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// Usaremos um proxy CORS para evitar bloqueios
const NOMINATIM_PROXY = "https://cors-anywhere.herokuapp.com/https://nominatim.openstreetmap.org/search";

let cities = [];

// Função para buscar coordenadas com tratamento de erros
async function getCoordinates(cityName) {
  try {
    const response = await fetch(`${NOMINATIM_PROXY}?city=${encodeURIComponent(cityName)}&state=RS&country=Brazil&format=json`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.length > 0 ? { lat: data[0].lat, lon: data[0].lon } : null;
  } catch (error) {
    console.error(`Erro ao buscar ${cityName}:`, error);
    return null;
  }
}

// Mapa atualizado com rate limiting
async function initMap() {
  const map = L.map('map').setView([-30.5, -53.2], 6.4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Adiciona marcadores com delay entre requisições
  const drawnCities = cities.filter(city => city.desenhada === "Sim");
  
  for (let i = 0; i < drawnCities.length; i++) {
    const city = drawnCities[i];
    try {
      const coords = await getCoordinates(city.nome);
      if (coords) {
        const marker = L.marker([coords.lat, coords.lon]).addTo(map);
        marker.bindPopup(`<b>${city.nome}</b><br><a href="${city.link}" target="_blank">Ver desenho</a>`);
      }
      // Delay de 1 segundo entre requisições para evitar bloqueio
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Erro ao processar ${city.nome}:`, error);
    }
  }
}

// Carrega os dados
document.addEventListener('DOMContentLoaded', () => {
  fetch(url)
    .then(res => res.text())
    .then(rep => {
      const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
      jsonData.table.rows.forEach(row => {
        cities.push({
          nome: row.c[0]?.v || '',
          desenhada: row.c[1]?.v || 'Não',
          link: row.c[2]?.v || '#'
        });
      });
      setupAutocomplete();
      initMap();
    })
    .catch(err => {
      console.error("Erro ao carregar dados:", err);
      document.getElementById("result").innerHTML = 
        "⚠️ Erro ao carregar dados. Por favor, recarregue a página.";
    });
});

// Configura o autocomplete
function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const datalist = document.getElementById("cityList");
  
  // Preenche o datalist com todas as cidades
  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city.nome;
    datalist.appendChild(option);
  });

  // Busca dinâmica enquanto digita
  input.addEventListener('input', () => {
    const value = input.value.toLowerCase();
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = '';
    resultDiv.className = '';
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
    } else {
      resultDiv.innerHTML = `✏️ <strong>${foundCity.nome}</strong> ainda não foi desenhada.`;
      resultDiv.className = "warning";
    }
  } else {
    resultDiv.innerHTML = `❌ Cidade não encontrada. Verifique se digitou corretamente.`;
    resultDiv.className = "error";
  }
}

// Mapa
function initMap() {
  const map = L.map('map').setView([-30.5, -53.2], 6.4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Adiciona marcadores
  cities.filter(city => city.desenhada === "Sim").forEach(city => {
    setTimeout(() => {  // Delay para evitar bloqueio do Nominatim
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.nome)},RS,Brazil`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            const marker = L.marker([data[0].lat, data[0].lon]).addTo(map);
            marker.bindPopup(`<b>${city.nome}</b><br><a href="${city.link}" target="_blank">Ver desenho</a>`);
          }
        })
        .catch(console.error);
    }, 100);
  });
}
