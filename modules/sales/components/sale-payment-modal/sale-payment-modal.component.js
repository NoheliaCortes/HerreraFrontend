const SalePaymentModal = (() => {
    let _onConfirm = null;

    function init({ onConfirm } = {}) {
        _onConfirm = onConfirm;
        document.getElementById('paymentModalCloseBtn')?.addEventListener('click', close);
        document.getElementById('paymentModalCancelBtn')?.addEventListener('click', close);
        document.getElementById('paymentModalConfirmBtn')?.addEventListener('click', _handleConfirm);
        document.getElementById('paymentModalPreview')?.addEventListener('click', event => {
            if (event.target?.id === 'paymentModalPreview') close();
        });
    }

    function open({ total, payment } = {}) {
        _setText('paymentModalTotal', _formatCurrency(total));
        _setText('paymentChange', _formatCurrency(0));
        _setText('paymentModalMessage', '');

        document.getElementById('paymentMethod').value = String(payment?.paymentMethodId ?? 1);
        document.getElementById('paymentAmount').value = payment?.amountReceived ? String(payment.amountReceived) : '';
        document.getElementById('paymentReference').value = payment?.transactionReference || '';
        document.getElementById('paymentDate').value = _toLocalDateTimeValue(new Date());

        document.getElementById('paymentModalPreview')?.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        _refreshIcons();
    }

    function close() {
        document.getElementById('paymentModalPreview')?.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function _handleConfirm() {
        const payment = {
            paymentMethodId: Number(document.getElementById('paymentMethod')?.value || 1),
            paymentMethodName: document.getElementById('paymentMethod')?.selectedOptions?.[0]?.textContent || 'Efectivo',
            amountReceived: _parseAmount(document.getElementById('paymentAmount')?.value),
            transactionReference: document.getElementById('paymentReference')?.value?.trim() || '',
            paymentDate: document.getElementById('paymentDate')?.value || '',
        };

        _onConfirm?.(payment);
    }

    function showMessage(message, isError = true) {
        const element = document.getElementById('paymentModalMessage');
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('modal-message-error', isError);
    }

    function updateChange(total, amountReceived) {
        const change = Math.max(Number(amountReceived || 0) - Number(total || 0), 0);
        _setText('paymentChange', _formatCurrency(change));
    }

    function _parseAmount(value) {
        const normalized = String(value || '')
            .replaceAll('C$', '')
            .replaceAll(',', '')
            .trim();
        return Number(normalized);
    }

    function _formatCurrency(value) {
        return `C$${new Intl.NumberFormat('es-NI', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value ?? 0))}`;
    }

    function _toLocalDateTimeValue(date) {
        const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return offsetDate.toISOString().slice(0, 16);
    }

    function _setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function _refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    return {
        init,
        open,
        close,
        showMessage,
        updateChange,
    };
})();
