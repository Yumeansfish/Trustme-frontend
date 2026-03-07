/**
 * BootstrapVue Shim Plugin for Vue 3
 *
 * Registers all b-* component names used in the codebase as simple
 * pass-through wrapper components. This allows the existing Pug
 * templates to compile and render without modification.
 *
 * Each shim renders a semantic HTML element and passes through
 * all props, attrs, slots and events.
 */
import { defineComponent, h } from 'vue';

const isSameValue = (left, right) => {
    if (left === right) return true;
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }
};

// Simple pass-through: renders a <div> with all attrs/slots
const makeDiv = (name) =>
    defineComponent({
        name,
        inheritAttrs: true,
        render() {
            return h('div', this.$attrs, this.$slots.default?.());
        },
    });

// Pass-through button
const BButton = defineComponent({
    name: 'BButton',
    inheritAttrs: true,
    props: {
        variant: String,
        size: String,
        block: Boolean,
        disabled: Boolean,
        type: { type: String, default: 'button' },
        to: [String, Object],
        href: String,
    },
    render() {
        const classes = ['btn'];
        if (this.variant) classes.push(`btn-${this.variant}`);
        if (this.size) classes.push(`btn-${this.size}`);
        if (this.block) classes.push('btn-block');

        if (this.to) {
            return h('router-link', { to: this.to, class: classes, ...this.$attrs }, this.$slots.default?.());
        }
        if (this.href) {
            return h('a', { href: this.href, class: classes, ...this.$attrs }, this.$slots.default?.());
        }
        return h(
            'button',
            { type: this.type, disabled: this.disabled, class: classes, ...this.$attrs },
            this.$slots.default?.()
        );
    },
});

// Form input
const BFormInput = defineComponent({
    name: 'BFormInput',
    inheritAttrs: true,
    props: {
        modelValue: [String, Number],
        value: [String, Number],
        type: { type: String, default: 'text' },
        size: String,
        state: { type: [Boolean, null], default: null },
        disabled: Boolean,
        placeholder: String,
    },
    emits: ['update:modelValue', 'input', 'change'],
    render() {
        const currentValue = this.modelValue ?? this.value ?? '';
        return h('input', {
            type: this.type,
            value: currentValue,
            disabled: this.disabled,
            placeholder: this.placeholder,
            class: ['form-control', this.size && `form-control-${this.size}`].filter(Boolean),
            onInput: (e) => {
                this.$emit('update:modelValue', e.target.value);
                this.$emit('input', e.target.value);
            },
            onChange: (e) => this.$emit('change', e.target.value),
            ...this.$attrs,
        });
    },
});

// Form select
const BFormSelect = defineComponent({
    name: 'BFormSelect',
    inheritAttrs: true,
    props: {
        modelValue: [String, Number, Array],
        value: [String, Number, Array],
        options: Array,
        size: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue', 'change'],
    render() {
        const normalizedOptions = (this.options || []).map((opt) => ({
            value: typeof opt === 'object' ? opt.value : opt,
            text: typeof opt === 'object' ? opt.text : opt,
        }));
        const currentValue = this.modelValue ?? this.value;
        const selectedIndex = normalizedOptions.findIndex((opt) => isSameValue(opt.value, currentValue));
        const optionPrefix = '__aw_opt_';
        const children = [];
        if (normalizedOptions.length > 0) {
            normalizedOptions.forEach((opt, index) => {
                children.push(h('option', { value: `${optionPrefix}${index}` }, opt.text));
            });
        }
        if (this.$slots.default) {
            children.push(this.$slots.default());
        }
        return h(
            'select',
            {
                value: selectedIndex >= 0 ? `${optionPrefix}${selectedIndex}` : currentValue,
                disabled: this.disabled,
                class: ['form-select', this.size && `form-select-${this.size}`].filter(Boolean),
                onChange: (e) => {
                    const rawValue = e.target.value;
                    const resolvedValue = rawValue.startsWith(optionPrefix)
                        ? normalizedOptions[Number(rawValue.slice(optionPrefix.length))]?.value
                        : rawValue;
                    this.$emit('update:modelValue', resolvedValue);
                    this.$emit('change', resolvedValue);
                },
                ...this.$attrs,
            },
            children
        );
    },
});

const BFormSelectOption = defineComponent({
    name: 'BFormSelectOption',
    props: { value: [String, Number, Object, Array] },
    render() {
        return h('option', { value: this.value }, this.$slots.default?.());
    },
});

// Form checkbox
const BFormCheckbox = defineComponent({
    name: 'BFormCheckbox',
    inheritAttrs: true,
    props: {
        modelValue: [Boolean, Array],
        value: [String, Number, Boolean, Object],
        switch: Boolean,
        disabled: Boolean,
    },
    emits: ['update:modelValue', 'change'],
    render() {
        return h('label', { class: 'form-check', ...this.$attrs }, [
            h('input', {
                type: 'checkbox',
                checked: Array.isArray(this.modelValue)
                    ? this.modelValue.includes(this.value)
                    : !!this.modelValue,
                disabled: this.disabled,
                class: 'form-check-input',
                onChange: (e) => {
                    let nextValue;
                    if (Array.isArray(this.modelValue)) {
                        const newVal = [...this.modelValue];
                        if (e.target.checked) newVal.push(this.value);
                        else newVal.splice(newVal.indexOf(this.value), 1);
                        nextValue = newVal;
                    } else {
                        nextValue = e.target.checked;
                    }
                    this.$emit('update:modelValue', nextValue);
                    this.$emit('change', nextValue);
                },
            }),
            h('span', { class: 'form-check-label' }, this.$slots.default?.()),
        ]);
    },
});

// Table - basic pass-through
const BTable = defineComponent({
    name: 'BTable',
    inheritAttrs: true,
    props: {
        items: Array,
        fields: Array,
        striped: Boolean,
        hover: Boolean,
        small: Boolean,
    },
    render() {
        return h('table', { class: 'table', ...this.$attrs }, this.$slots.default?.());
    },
});

export function registerBootstrapShims(app) {
    // Core components
    app.component('b-button', BButton);
    app.component('b-btn', BButton);
    app.component('b-form-input', BFormInput);
    app.component('b-input', BFormInput);
    app.component('b-form-select', BFormSelect);
    app.component('b-select', BFormSelect);
    app.component('b-form-select-option', BFormSelectOption);
    app.component('b-form-checkbox', BFormCheckbox);
    app.component('b-checkbox', BFormCheckbox);
    app.component('b-table', BTable);

    // Layout pass-throughs (render as divs)
    const divComponents = [
        'b-card', 'b-card-body', 'b-card-header', 'b-card-footer',
        'b-row', 'b-col',
        'b-container',
        'b-form-group',
        'b-input-group', 'b-input-group-append', 'b-input-group-prepend',
        'b-button-group', 'b-button-toolbar', 'b-btn-group',
        'b-badge',
        'b-spinner',
        'b-collapse',
        'b-nav', 'b-nav-item',
        'b-tabs', 'b-tab',
        'b-dropdown', 'b-dropdown-item',
        'b-form', 'b-form-row',
        'b-list-group', 'b-list-group-item',
        'b-media', 'b-media-body',
        'b-popover', 'b-tooltip',
        'b-progress', 'b-progress-bar',
        'b-pagination',
        'b-skeleton',
        'b-overlay',
        'b-form-textarea',
        'b-form-datepicker',
        'b-dropdown-divider',
        'b-dropdown-item-button',
        'b-form-file',
        'b-card-group',
    ];

    divComponents.forEach((name) => {
        if (!app.component(name)) {
            app.component(name, makeDiv(name));
        }
    });
}
