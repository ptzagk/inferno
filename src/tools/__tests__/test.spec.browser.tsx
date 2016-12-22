import { assert, spy } from 'sinon';
import {
  createRenderer,
  findAllInRenderedTree,
  isDOMComponent,
  renderIntoDocument,
  scryRenderedDOMComponentsWithClass,
  scryRenderedDOMComponentsWithTag,
} from '../testUtils';
import { findDOMNode, options, render } from 'inferno';

import Component from 'inferno-component';
import Inferno from 'inferno';
import createClass from 'inferno-create-class';
import { expect } from 'chai';

Inferno;


options.findDOMNodeEnabled = true;

describe('ReactTestUtils', () => {
  describe('Shallow Renderer', () => {
    it('should have shallow rendering', () => {
      class SomeComponent extends Component<any, any> {
        render() {
          return (
            <div>
              <span className="child1" />
              <span className="child2" />
            </div>
          );
        }
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SomeComponent />);

      expect(result.type).to.equal('div');
      expect(result.props.children).to.eql([
        <span className="child1" />,
        <span className="child2" />,
      ]);
    });

    it('should shallow render a functional component', () => {
      function SomeComponent() {
        return (
          <div>
            <span className="child1" />
            <span className="child2" />
          </div>
        );
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SomeComponent />);

      expect(result.type).to.equal('div');
      expect(result.props.children).to.eql([
        <span className="child1" />,
        <span className="child2" />,
      ]);
    });

    it('should throw for invalid elements', () => {
      class SomeComponent extends Component<any, any> {
        render() {
          return <div />;
        }
      }

      const shallowRenderer = createRenderer();
      expect(() => shallowRenderer.render(SomeComponent as any)).to.throw(
        'ReactShallowRenderer render(): Invalid component element. Instead of ' +
        'passing a component class, make sure to instantiate it by passing it ' +
        'to createElement.'
      );
      expect(() => shallowRenderer.render(<div />)).to.throw(
        'ReactShallowRenderer render(): Shallow rendering works only with ' +
        'custom components, not primitives (div). Instead of calling ' +
        '`.render(el)` and inspecting the rendered output, look at `el.props` ' +
        'directly instead.'
      );
    });

    it('should have shallow unmounting', () => {
      const obj = { fn () {} }; 
      const componentWillUnmount = spy(obj, 'fn');

      const SomeComponent = createClass({
        render: function() {
          return <div />;
        },
        componentWillUnmount,
      });

      const shallowRenderer = createRenderer();
      shallowRenderer.render(<SomeComponent />);
      shallowRenderer.unmount();

      assert.calledOnce(componentWillUnmount);
    });

    it('can shallow render to null', () => {
      class SomeComponent extends Component<any, any> {
        render() {
          return null;
        }
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SomeComponent />);

      expect(result).to.equal(null);
    });

    it('can shallow render with a ref', () => {
      class SomeComponent extends Component<any, any> {
        render() {
          return <div ref="hello" />;
        }
      }

      const shallowRenderer = createRenderer();
      // Shouldn't crash.
      shallowRenderer.render(<SomeComponent />);
    });

    it('lets you update shallowly rendered components', () => {
      class SomeComponent extends Component<any, any> {
        state = {clicked: false};

        onClick = () => {
          this.setState({clicked: true});
        };

        render() {
          const className = this.state.clicked ? 'was-clicked' : '';

          if (this.props.aNew === 'prop') {
            return (
              <a
                href="#"
                onClick={this.onClick}
                className={className}>
                Test link
              </a>
            );
          } else {
            return (
              <div>
                <span className="child1" />
                <span className="child2" />
              </div>
            );
          }
        }
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SomeComponent />);
      expect(result.type).to.equal('div');
      expect(result.props.children).to.equal([
        <span className="child1" />,
        <span className="child2" />,
      ]);

      const updatedResult = shallowRenderer.render(<SomeComponent aNew="prop" />);
      expect(updatedResult.type).to.equal('a');

      const mockEvent = {};
      updatedResult.events['onClick'](mockEvent);

      const updatedResultCausedByClick = shallowRenderer.getRenderOutput();
      expect(updatedResultCausedByClick.type).to.equal('a');
      expect(updatedResultCausedByClick.props['className']).to.equal('was-clicked');
    });

    it('can access the mounted component instance', () => {
      class SimpleComponent extends Component<any, any> {
        someMethod = () => {
          return this.props.n;
        };

        render() {
          return <div>{this.props.n}</div>;
        }
      }

      const shallowRenderer = createRenderer();
      shallowRenderer.render(<SimpleComponent n={5} />);
      expect(shallowRenderer.getMountedInstance().someMethod()).to.equal(5);
    });

    it('can shallowly render components with ref as function', () => {
      class SimpleComponent extends Component<any, any> {
        state = {clicked: false};

        handleUserClick = () => {
          this.setState({ clicked: true });
        };

        render() {
          return (
            <div
              ref={() => {}}
              onClick={this.handleUserClick}
              className={this.state.clicked ? 'clicked' : ''}
            />
          );
        }
      }

      const shallowRenderer = createRenderer();
      shallowRenderer.render(<SimpleComponent />);
      let result = shallowRenderer.getRenderOutput();
      expect(result.type).to.equal('div');
      expect(result.props.className).to.equal('');
      result.props.onClick();

      result = shallowRenderer.getRenderOutput();
      expect(result.type).to.equal('div');
      expect(result.props.className).to.equal('clicked');
    });

    it('can setState in componentWillMount when shallow rendering', () => {
      class SimpleComponent extends Component<any, any> {
        componentWillMount() {
          this.setState({groovy: 'doovy'});
        }

        render() {
          return <div>{this.state.groovy}</div>;
        }
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SimpleComponent />);
      expect(result).to.equal(<div>doovy</div>);
    });

    it('can pass context when shallowly rendering', () => {
      class SimpleComponent extends Component<any, any> {
        render() {
          return <div>{this.context.name}</div>;
        }
      }

      const shallowRenderer = createRenderer();
      const result = shallowRenderer.render(<SimpleComponent />, {
        name: 'foo',
      });
      expect(result).to.equal(<div>foo</div>);
    });
  });

  it('can scryRenderedDOMComponentsWithClass with TextComponent', () => {
    class Wrapper extends Component<any, any> {
      render() {
        return <div>Hello <span>Jim</span></div>;
      }
    }

    const renderedComponent = renderIntoDocument(<Wrapper />);
    const scryResults = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      'NonExistentClass'
    );
    expect(scryResults.length).to.equal(0);
  });

  it('can scryRenderedDOMComponentsWithClass with className contains \\n', () => {
    class Wrapper extends Component<any, any> {
      render() {
        return <div>Hello <span className={'x\ny'}>Jim</span></div>;
      }
    }

    const renderedComponent = renderIntoDocument(<Wrapper />);
    const scryResults = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      'x'
    );
    expect(scryResults.length).to.equal(1);
  });

  it('can scryRenderedDOMComponentsWithClass with multiple classes', () => {
    class Wrapper extends Component<any, any> {
      render() {
        return <div>Hello <span className={'x y z'}>Jim</span></div>;
      }
    }

    const renderedComponent = renderIntoDocument(<Wrapper />);
    const scryResults1 = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      'x y'
    );
    expect(scryResults1.length).to.equal(1);

    const scryResults2 = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      'x z'
    );
    expect(scryResults2.length).to.equal(1);

    const scryResults3 = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      ['x', 'y']
    );
    expect(scryResults3.length).to.equal(1);

    expect(scryResults1[0]).to.equal(scryResults2[0]);
    expect(scryResults1[0]).to.equal(scryResults3[0]);

    const scryResults4 = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      ['x', 'a']
    );
    expect(scryResults4.length).to.equal(0);

    const scryResults5 = scryRenderedDOMComponentsWithClass(
      renderedComponent,
      ['x a']
    );
    expect(scryResults5.length).to.equal(0);
  });

  it('traverses children in the correct order', () => {
    class Wrapper extends Component<any, any> {
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    const container = document.createElement('div');
    render(
      <Wrapper>
        {null}
        <div>purple</div>
      </Wrapper>,
      container
    );
    const tree = render(
      <Wrapper>
        <div>orange</div>
        <div>purple</div>
      </Wrapper>,
      container
    );

    const log = [];
    findAllInRenderedTree(tree, function(child) {
      if (isDOMComponent(child)) {
        log.push(findDOMNode(child).textContent);
      }
    });

    // Should be document order, not mount order (which would be purple, orange)
    expect(log).lengthOf.to.equal(3);
    expect(log[0]).to.equal('orangepurple');
    expect(log[0]).to.equal('orange');
    expect(log[0]).to.equal('purple');
  });

  it('can scry with stateless components involved', () => {
    const Stateless = () => <div><hr /></div>;

    class SomeComponent extends Component<any, any> {
      render() {
        return (
          <div>
            <Stateless />
            <hr />
          </div>
        );
      }
    }

    const inst = renderIntoDocument(<SomeComponent />);
    const hrs = scryRenderedDOMComponentsWithTag(inst, 'hr');
    expect(hrs.length).to.equal(2);
  });
});