import Root from './responsive-dialog.svelte'
import Trigger from './responsive-dialog-trigger.svelte'
import Content from './responsive-dialog-content.svelte'
import Header from './responsive-dialog-header.svelte'
import Body from './responsive-dialog-body.svelte'
import Footer from './responsive-dialog-footer.svelte'
import Title from './responsive-dialog-title.svelte'
import Description from './responsive-dialog-description.svelte'
import { isDesktop } from './context'

export {
	Root,
	Trigger,
	Content,
	Header,
	Body,
	Footer,
	Title,
	Description,
	isDesktop,
	//
	Root as ResponsiveDialog,
	Trigger as ResponsiveDialogTrigger,
	Content as ResponsiveDialogContent,
	Header as ResponsiveDialogHeader,
	Body as ResponsiveDialogBody,
	Footer as ResponsiveDialogFooter,
	Title as ResponsiveDialogTitle,
	Description as ResponsiveDialogDescription
}
