import { getComponentName } from './get-component-name';
import { isRegistered } from './is-registered';
import { attributeName } from './attribute-mapper';
import { kebabToCamel } from './case-converters';
import { ComponentInstance, ComponentType } from './internal-types';
import { PropValue } from './types';

export const register = (context: ComponentType, silent: boolean): boolean => {
  /* eslint-disable no-param-reassign,no-underscore-dangle,func-names */
  const dashedName = getComponentName(context);

  if (!context.componentName) {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.warn(`Static property "componentName" missing. Setting it to "${dashedName}"…`);
    }
    context.componentName = dashedName;
  }

  if (isRegistered(context.componentName)) {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.warn(`Attempt to re-register component "${context.componentName}". Skipping…`);
    }
    return false;
  }

  context.dependencies.forEach((component): boolean => component.register(silent));

  const allAttributes = (context.attributes && context.attributes.length ? context.attributes : [])
    .filter((attribute) => attribute);

  context.observedAttributes = allAttributes.map(attributeName);

  allAttributes.forEach((attribute): void => {
    const name = attributeName(attribute);
    const nameCamel = kebabToCamel(name);
    const prop = {
      get(): PropValue {
        return this.props[nameCamel];
      },
      set(value?: PropValue): void {
        this.attributeChangedCallback(name, this.props[nameCamel], value);
      },
    };

    Object.defineProperty(context.prototype, name, prop);
    Object.defineProperty(context.prototype, nameCamel, prop);
  });

  const originalConnectedCallback = context.prototype.connectedCallback;

  context.prototype.connectedCallback = function (): void {
    const instance = (this as ComponentInstance);

    originalConnectedCallback.bind(instance)();

    while (instance.__attributeChangedCallbackStack.length) {
      instance.__attributeChangedCallbackStack.pop()();
    }

    instance.__created = true;
    instance.render();
  };

  const originalAttributeChangedCallback = context.prototype.attributeChangedCallback;

  context.prototype.attributeChangedCallback = function (...args): void {
    const instance = (this as ComponentInstance);
    const callFunction = (): void => originalAttributeChangedCallback.bind(instance)(...args);

    if (instance.__created) {
      callFunction();
    } else {
      instance.__attributeChangedCallbackStack.unshift(callFunction);
    }
  };

  customElements.define(context.componentName, context);

  return true;
  /* eslint-enable no-param-reassign,no-underscore-dangle,func-names */
};
