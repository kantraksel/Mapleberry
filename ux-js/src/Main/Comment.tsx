import { ReactNode } from 'react';

function Comment(props: { txt?: string, children?: ReactNode, disabled?: boolean }) {
	if (props.disabled) {
		return props.children;
	}
	return <></>;
}

export default Comment;
