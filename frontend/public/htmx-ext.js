htmx.defineExtension('date', {
    onEvent: function (name, evt) {
        if (name === 'htmx:afterProcessNode') {
            const element = evt.detail.elt;
            const dataDate = element.dataset.date;
            if (dataDate) {
                const timestamp = parseInt(dataDate);
                const date = new Date(timestamp);
                const today = new Date();

                let formatted;
                if (date.toDateString() === today.toDateString()) {
                    formatted = date.toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' });
                } else {
                    formatted = date.toLocaleDateString(navigator.language, { day: 'numeric', month: 'short' });
                }
                element.textContent = formatted;
            };
        }
    }
});
