class FormHelper {

    static open(action = '', method = 'POST', attributes = {}) {
        method = method.toUpperCase();

        let attrs = this.attributes({
            action,
            method,
            ...attributes
        });

        return `<form ${attrs}>`;
    }

    static close() {
        return `</form>`;
    }

    static text(name, value = '', attributes = {}) {
        return this.input('text', name, value, attributes);
    }

    static email(name, value = '', attributes = {}) {
        return this.input('email', name, value, attributes);
    }

    static password(name, value = '', attributes = {}) {
        return this.input('password', name, value, attributes);
    }

    static number(name, value = '', attributes = {}) {
        return this.input('number', name, value, attributes);
    }

    static file(name, value = '', attributes = {}) {
        return this.input('file', name, value, attributes);
    }

    static hidden(name, value = '', attributes = {}) {
        return this.input('hidden', name, value, attributes);
    }

    static radio(name, value, checked = false, attributes = {}) {
        let checkedAttr = checked ? 'checked' : '';
        return `<input type="radio" name="${name}" value="${value}" ${checkedAttr} ${this.attributes(attributes)}>`;
    }

    static checkbox(name, value, checked = false, attributes = {}) {
        let checkedAttr = checked ? 'checked="checked"' : '';
        return `<input type="checkbox" name="${name}" value="${value}" ${checkedAttr} ${this.attributes(attributes)}>`;
    }

    static textarea(name, value = '', attributes = {}) {
        return `<textarea name="${name}" ${this.attributes(attributes)}>${value}</textarea>`;
    }

    static dropdown(name, options = {}, selected = '', attributes = {}) {
        let opts = '';

        for (let key in options) {
            let isSelected = key == selected ? 'selected' : '';
            opts += `<option value="${key}" ${isSelected}>${options[key]}</option>`;
        }

        return `<select name="${name}" ${this.attributes(attributes)}>${opts}</select>`;
    }

    static submit(label, attributes = {}) {
        attributes.type = 'submit';
        return `<button ${this.attributes(attributes)}>${label}</button>`;
    }

    static button(label, attributes = {}) {
        attributes.type = 'button';
        return `<button ${this.attributes(attributes)}>${label}</button>`;
    }

    static label(text, forAttr = null, attributes = {}) {
        let attr = this.attributes(attributes);
        return `<label for="${forAttr || ''}" ${attr}><b>${text}</b></label>`;
    }

    // 🔥 INTERNAL METHODS
    static input(type, name, value, attributes = {}) {
        return `<input type="${type}" name="${name}" value="${value}" ${this.attributes(attributes)}>`;
    }

    static attributes(attributes = {}) {
        return Object.entries(attributes)
            .map(([key, val]) => `${key}="${val}"`)
            .join(' ');
    }
}

module.exports = FormHelper;