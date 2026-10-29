const form = document.getElementById("ticketForm");
const ticketList = document.getElementById("ticketList");
const searchInput = document.getElementById("searchInput");

let tickets = JSON.parse(localStorage.getItem("resolveXTickets") || "[]");
let activeFilter = "All";
let nextId = Number(localStorage.getItem("resolveXNextId")) || 1001;

const priorityValue = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
};

class MaxHeap {
  constructor() {
    this.heap = [];
  }
  push(ticket) {
    this.heap.push(ticket);
    let index = this.heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (priorityValue[this.heap[parent].priority] >= priorityValue[this.heap[index].priority]) {
        break;
      }
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }
  pop() {
    if (this.heap.length === 0) return null;
    const highest = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapify(0);
    }
    return highest;
  }
  heapify(index) {
    const size = this.heap.length;
    let largest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    if (left < size && priorityValue[this.heap[left].priority] > priorityValue[this.heap[largest].priority]) {
      largest = left;
    }
    if (right < size && priorityValue[this.heap[right].priority] > priorityValue[this.heap[largest].priority]) {
      largest = right;
    }
    if (largest !== index) {
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      this.heapify(largest);
    }
  }
  isEmpty() {
    return this.heap.length === 0;
  }
}

const ticketMap = new Map();

function rebuildStructures() {
  ticketMap.clear();
  tickets.forEach(ticket => {
    ticketMap.set(ticket.id, ticket);
  });
}

function saveTickets() {
  localStorage.setItem("resolveXTickets", JSON.stringify(tickets));
  localStorage.setItem("resolveXNextId", String(nextId));
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const priority = document.getElementById("priority").value;
  if (!name || !title || !description) {
    alert("Please fill in all fields.");
    return;
  }
  const ticket = {
    id: "RX-" + nextId++,
    name,
    title,
    description,
    priority,
    status: "Open",
    createdAt: new Date().toLocaleString()
  };
  tickets.push(ticket);
  ticketMap.set(ticket.id, ticket);
  saveTickets();
  form.reset();
  document.getElementById("priority").value = "Medium";
  renderTickets();
  alert("Ticket submitted! ID: " + ticket.id);
});

function getPrioritySortedTickets() {
  const heap = new MaxHeap();
  tickets.forEach(ticket => heap.push(ticket));
  const sorted = [];
  while (!heap.isEmpty()) {
    sorted.push(heap.pop());
  }
  return sorted;
}

function renderTickets() {
  rebuildStructures();
  const sortedTickets = getPrioritySortedTickets();
  const searchText = searchInput.value.trim().toLowerCase();
  const visibleTickets = sortedTickets.filter(ticket => {
    const matchesFilter = activeFilter === "All" || ticket.status === activeFilter;
    const searchableText = (ticket.id + " " + ticket.name + " " + ticket.title + " " + ticket.description + " " + ticket.priority).toLowerCase();
    return matchesFilter && searchableText.includes(searchText);
  });

  document.getElementById("totalTickets").textContent = tickets.length;
  document.getElementById("highTickets").textContent = tickets.filter(t => t.priority === "High" || t.priority === "Critical").length;
  document.getElementById("pendingTickets").textContent = tickets.filter(t => t.status !== "Resolved").length;
  document.getElementById("resolvedTickets").textContent = tickets.filter(t => t.status === "Resolved").length;

  if (visibleTickets.length === 0) {
    ticketList.innerHTML = `<div class="empty-state"><h3>No tickets found</h3><p>Try another search or create a new ticket.</p></div>`;
    return;
  }

  ticketList.innerHTML = visibleTickets.map(ticket => `
    <article class="ticket-card priority-${ticket.priority}">
      <div class="ticket-top"><div><p class="ticket-id">${escapeHTML(ticket.id)}</p><h3>${escapeHTML(ticket.title)}</h3></div><span class="tag tag-${ticket.priority}">${ticket.priority} Priority</span></div>
      <p class="ticket-description">${escapeHTML(ticket.description)}</p>
      <div class="ticket-meta"><span>👤 ${escapeHTML(ticket.name)}</span><span>📅 ${escapeHTML(ticket.createdAt)}</span><span>Status: <strong>${escapeHTML(ticket.status)}</strong></span></div>
      <div class="ticket-actions">
        <select onchange="updateStatus('${ticket.id}', this.value)"><option value="Open" ${ticket.status === "Open" ? "selected" : ""}>Open</option><option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option><option value="Resolved" ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option></select>
        <button class="delete-btn" type="button" onclick="deleteTicket('${ticket.id}')">Delete</button>
      </div>
    </article>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return replacements[character];
  });
}

function updateStatus(id, newStatus) {
  const ticket = ticketMap.get(id);
  if (!ticket) return;
  ticket.status = newStatus;
  saveTickets();
  renderTickets();
}

function deleteTicket(id) {
  if (!confirm("Delete ticket " + id + "?")) return;
  tickets = tickets.filter(item => item.id !== id);
  saveTickets();
  renderTickets();
}

document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", function () {
    activeFilter = this.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    this.classList.add("active");
    renderTickets();
  });
});

searchInput.addEventListener("input", renderTickets);
renderTickets();