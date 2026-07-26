import { describe, it, expect } from 'vitest';
import { parseNatSpec, privilegeFromModifiers, matchDoc } from './natspec.js';

const SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Vault {
    /// @notice Withdraw a specified amount of your deposited funds.
    /// @param amount The amount to withdraw, in wei.
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Drain the whole contract balance to the owner.
     * @dev Only callable by the contract owner.
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Grant a role to an account.
    function grantThing(bytes32 role, address account)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grant(role, account);
    }

    function noDocs(uint256 x) external nonReentrant whenNotPaused {}
}
`;

describe('parseNatSpec', () => {
  const docs = parseNatSpec([{ path: 'Vault.sol', content: SOURCE }]);

  it('extracts @notice and @param for a documented function', () => {
    const doc = matchDoc(docs['withdraw'], ['uint256']);
    expect(doc?.notice).toBe('Withdraw a specified amount of your deposited funds.');
    expect(doc?.params?.amount).toBe('The amount to withdraw, in wei.');
    expect(doc?.paramTypes).toEqual(['uint256']);
  });

  it('parses block comments with @dev and disambiguates overloads by arity', () => {
    const doc = matchDoc(docs['withdraw'], []);
    expect(doc?.notice).toBe('Drain the whole contract balance to the owner.');
    expect(doc?.dev).toBe('Only callable by the contract owner.');
    expect(doc?.modifiers).toContain('onlyOwner');
  });

  it('captures onlyRole(...) with its role argument', () => {
    const doc = matchDoc(docs['grantThing'], ['bytes32', 'address']);
    expect(doc?.modifiers).toContain('onlyRole(DEFAULT_ADMIN_ROLE)');
  });

  it('ignores guard-only modifiers (no notice/params) as noise', () => {
    // noDocs has only nonReentrant/whenNotPaused and no NatSpec: still recorded
    // because modifiers are present, but not treated as privileged.
    const doc = matchDoc(docs['noDocs'], ['uint256']);
    expect(privilegeFromModifiers(doc?.modifiers)).toBeUndefined();
  });

  it('returns an empty map for empty input', () => {
    expect(parseNatSpec(undefined)).toEqual({});
    expect(parseNatSpec([])).toEqual({});
  });

  it('handles function names that collide with Object.prototype keys', () => {
    const src = `
      /// @notice Render as string.
      function toString(uint256 x) external onlyOwner {}
      /// @notice Ctor-like name.
      function constructor2() external {}
    `;
    // Must not throw (regression: null-prototype accumulator).
    const parsed = parseNatSpec([{ content: src }]);
    const doc = matchDoc(parsed['toString'], ['uint256']);
    expect(doc?.notice).toBe('Render as string.');
    expect(doc?.modifiers).toContain('onlyOwner');
  });
});

describe('body-level access detection', () => {
  it('detects a custom modifier whose definition checks the caller', () => {
    const src = `
      contract C {
        modifier auth() { require(msg.sender == admin, "no"); _; }
        function poke(uint256 x) external auth {}
      }
    `;
    const docs = parseNatSpec([{ content: src }]);
    const doc = matchDoc(docs['poke'], ['uint256']);
    expect(doc?.access?.kind).toBe('custom');
    expect(doc?.access?.detail).toMatch(/auth/);
  });

  it('detects an inline require(msg.sender == owner()) with no modifier', () => {
    const src = `
      contract C {
        function sweep() external {
          require(msg.sender == owner(), "not owner");
        }
      }
    `;
    const docs = parseNatSpec([{ content: src }]);
    const doc = matchDoc(docs['sweep'], []);
    expect(doc?.access).toMatchObject({ kind: 'ownable' });
  });

  it('detects _checkRole(ROLE) and captures the role', () => {
    const src = `
      contract C {
        function setThing(uint256 v) public {
          _checkRole(MANAGER_ROLE);
        }
      }
    `;
    const docs = parseNatSpec([{ content: src }]);
    const doc = matchDoc(docs['setThing'], ['uint256']);
    expect(doc?.access).toMatchObject({ kind: 'access-control', role: 'MANAGER_ROLE' });
  });

  it('does not flag a function with no caller check', () => {
    const src = `
      contract C {
        function ping(uint256 x) external { emit Pinged(x); }
      }
    `;
    const docs = parseNatSpec([{ content: src }]);
    // ping has no docs, no modifiers and no access check -> not recorded at all.
    expect(docs['ping']).toBeUndefined();
  });
});

describe('privilegeFromModifiers', () => {
  it('recognises onlyOwner as an ownable privilege', () => {
    expect(privilegeFromModifiers(['onlyOwner'])).toMatchObject({ ownable: true });
  });

  it('recognises onlyRole(ROLE) and extracts the role', () => {
    expect(privilegeFromModifiers(['onlyRole(MINTER_ROLE)'])).toMatchObject({
      role: 'MINTER_ROLE',
      ownable: false,
    });
  });

  it('does not treat reentrancy/pause guards as privilege', () => {
    expect(privilegeFromModifiers(['nonReentrant', 'whenNotPaused'])).toBeUndefined();
  });
});
