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
        type: { type: String, default: 'text' },
        size: String,
        state: { type: [Boolean, null], default: null },
        disabled: Boolean,
        placeholder: String,
    },
    emits: ['update:modelValue'],
    render() {
        return h('input', {
            type: this.type,
            value: this.modelValue,
            disabled: this.disabled,
            placeholder: this.placeholder,
            class: ['form-control', this.size && `form-control-${this.size}`].filter(Boolean),
            onInput: (e) => this.$emit('update:modelValue', e.target.value),
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
        options: Array,
        size: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue'],
    render() {
        const children = [];
        if (this.options) {
            this.options.forEach((opt) => {
                const val = typeof opt === 'object' ? opt.value : opt;
                const text = typeof opt === 'object' ? opt.text : opt;
                children.push(h('option', { value: val }, text));
            });
        }
        if (this.$slots.default) {
            children.push(this.$slots.default());
        }
        return h(
            'select',
            {
                value: this.modelValue,
                disabled: this.disabled,
                class: ['form-select', this.size && `form-select-${this.size}`].filter(Boolean),
                onChange: (e) => this.$emit('update:modelValue', e.target.value),
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
    emits: ['update:modelValue'],
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
                    if (Array.isArray(this.modelValue)) {
                        const newVal = [...this.modelValue];
                        if (e.target.checked) newVal.push(this.value);
                        else newVal.splice(newVal.indexOf(this.value), 1);
                        this.$emit('update:modelValue', newVal);
                    } else {
                        this.$emit('update:modelValue', e.target.checked);
                    }
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

// Modal - basic pass-through
const BModal = defineComponent({
    name: 'BModal',
    inheritAttrs: true,
    props: {
        id: String,
        title: String,
    },
    render() {
        return h('div', { class: 'modal', ...this.$attrs }, this.$slots.default?.());
    },
});

export function registerBootstrapShims(app) {
    // Core components
    app.component('b-button', BButton);
    app.component('b-btn', BButton);
    app.component('b-form-input', BFormInput);
    app.component('b-form-select', BFormSelect);
    app.component('b-form-select-option', BFormSelectOption);
    app.component('b-form-checkbox', BFormCheckbox);
    app.component('b-table', BTable);
    app.component('b-modal', BModal);

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
        'b-input',
        'b-form-datepicker',
        'b-dropdown-divider',
        'b-dropdown-item-button',
        'b-form-file',
        'b-card-group',
        'b-select',
    ];

    divComponents.forEach((name) => {
        if (!app.component(name)) {
            app.component(name, makeDiv(name));
        }
    });
}
