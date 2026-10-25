const countEls = document.querySelectorAll('[data-cart-count]');
let cartCount = Number(localStorage.getItem('vayro-cart') || 0);
const updateCount = () => countEls.forEach((el) => { el.textContent = cartCount; });
const toast = document.querySelector('[data-toast]');
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
updateCount();
document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
  button.addEventListener('click', () => {
    cartCount += 1;
    localStorage.setItem('vayro-cart', String(cartCount));
    updateCount();
    showToast(`${button.dataset.addToCart} added to your bag.`);
  });
});
document.querySelectorAll('[data-cart-button]').forEach((button) => {
  button.addEventListener('click', () => showToast(cartCount ? `Your bag has ${cartCount} item${cartCount === 1 ? '' : 's'}.` : 'Your bag is empty—for now.'));
});
document.querySelectorAll('[data-filter]').forEach((filter) => {
  filter.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
    filter.classList.add('active');
    const category = filter.dataset.filter;
    document.querySelectorAll('[data-category]').forEach((card) => card.classList.toggle('hidden', category !== 'all' && card.dataset.category !== category));
  });
});
document.querySelectorAll('[data-signup-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.reset();
    const message = form.parentElement.querySelector('[data-form-message]');
    if (message) message.textContent = 'You’re on the list. See you at the next drop.';
  });
});
