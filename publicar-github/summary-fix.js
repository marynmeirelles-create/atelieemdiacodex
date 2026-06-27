(function () {
  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function todayMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  function monthKey(date) {
    return (date || new Date().toISOString()).slice(0, 7);
  }

  function itemsSubtotal(order) {
    return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  }

  function discountAmount(order) {
    const subtotal = itemsSubtotal(order);
    if (order.discountMode === "percent") return Math.min(subtotal, subtotal * Number(order.discountValue || 0) / 100);
    return Math.min(subtotal, Number(order.discountValue || 0));
  }

  function freightCharged(order) {
    return order.freightPayer === "client" ? Number(order.freightValue || 0) : 0;
  }

  function orderTotal(order) {
    return Math.max(0, itemsSubtotal(order) - discountAmount(order) + freightCharged(order));
  }

  function paidAmount(order) {
    if (order.paymentStatus === "paid") return orderTotal(order);
    if (order.paymentStatus === "deposit") return Number(order.deposit || 0);
    return 0;
  }

  async function refreshMonthSummary() {
    if (!window.AtelieDB) return;
    const cards = Array.from(document.querySelectorAll("#dayView .summary-card"));
    if (cards.length < 5) return;
    const orders = (await AtelieDB.getAll("orders")).filter((order) => !order.deletedAt);
    const currentMonth = todayMonth();
    const received = orders
      .filter((order) => paidAmount(order) > 0 && monthKey(order.paymentUpdatedAt || order.updatedAt || order.createdAt || order.deliveryDate) === currentMonth)
      .reduce((sum, order) => sum + paidAmount(order), 0);
    const sold = orders
      .filter((order) => monthKey(order.createdAt || order.deliveryDate) === currentMonth)
      .reduce((sum, order) => sum + orderTotal(order), 0);
    cards[3].querySelector(".value").textContent = money(received);
    cards[4].querySelector(".value").textContent = money(sold);
  }

  const observer = new MutationObserver(() => refreshMonthSummary());
  window.addEventListener("load", () => {
    const dayView = document.querySelector("#dayView");
    if (dayView) observer.observe(dayView, { childList: true, subtree: true });
    refreshMonthSummary();
  });
})();
