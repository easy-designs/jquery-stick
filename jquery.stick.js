;(function( $, window, document ){

		// strings
	var FIXED = 'fixed',
		STATIC = 'static',
		RELATIVE = 'relative',
		IMPORTANT = ' !important;',
		COLON = ':',
		SIDES = 'top right bottom left'.split(' '),
		POSITION = 'position',
		MARGIN = 'margin-',
		PX = 'px',
		
		// references
		TRUE = true,
		FALSE = false,
		$win = $(window),
		$body = $(document.body),

		// default config
		defaults = {
			side: SIDES[0],
			offset: 0,
			zindex: 1000,
			onStick: function(){},
			onUnstick: function(){}
		},
		
		// position: fixed support
		supports_fixed = (function(){
			
			var $el = $('<div style="position:fixed;top:100px;">x</div>'),
				el = $el.get(0),
				o_height = $body.height(),
				o_scrollTop = $body.scrollTop(),
				// negativee, I know
				supported = FALSE;

			if ( 'getBoundingClientRect' in el )
			{
				// add the element to the document and scroll
				$body
					.append( $el )
					.height(3000)
					.scrollTop(500);
				
				// test to see if it moved
				supported = ( el.getBoundingClientRect().top === 100 );
				
				// return to your normally-scheduled programming
				$el.remove();
				$body
					.scrollTop( o_scrollTop )
					.height( 'auto' );
			}

			return supported;
			
		})(),
		
		// The object
		Stick = (function(){

		  	function Stick( target, args )
			{
				this.target = target;
				this.state = STATIC;
				this.total_offset = 0;
				this.width = target.width();
				this.height = target.height();
				
				// get the original offset sides & margins
				var i = SIDES.length,
					offset,
					offsets = {};
				while ( i-- )
				{
					offset = target.css( SIDES[i] );
					offsets[ SIDES[i] ] = offset == 'auto' ? 0 : offset;
				}
				this.original_offsets = offsets;
				
				// fixed takes the element out of the normal flow,
				// we need to add it back in
				if ( supports_fixed )
				{
					this.holder = $('<div class="sticky-holder"/>')
										.hide()
										.width( target.outerWidth() )
										.height( target.outerHeight() );
					target.after( this.holder );
				}
				
				this.positioning = target.css( POSITION );
				
				if ( this.positioning == STATIC )
				{
					target.css( POSITION, RELATIVE );
					this.positioning = RELATIVE;
				}
				
				// config
				if ( typeof args === "number" )
				{
					args = {
						offset: args
					};
				}
				$.extend( this, defaults, args );
				
				this.resize();
				
				(function(s){
					return $win
							.scroll(function(){
								return s.scroll();
							 })
							.resize(function(){
								return s.resize();
							 });
				})(this);
			}
			
			Stick.prototype.position = function()
			{
				var position = supports_fixed ? FIXED : this.positioning,
					offset = supports_fixed ? this.offset : this.total_offset;
				
				if ( supports_fixed &&
					 this.state == FIXED )
				{
					this.holder.show();
				}
				else
				{
					this.holder.hide();
				}
				
				return this.target.attr(
					'style',
					(
						this.state == FIXED ?	POSITION + COLON + position + IMPORTANT +
												this.side + COLON + offset + PX + IMPORTANT + 
												'width' + COLON + this.width + PX + IMPORTANT + 
												'height' + COLON + this.height + PX + IMPORTANT + 
												'z-index: ' + this.zindex + IMPORTANT
											:	''
					)
				);
			};

			Stick.prototype.resize = function()
			{
				var win_w_new = $win.width();
				
				// IE wants to constantly run resize for some reason
				// Let’s make sure it is actually a resize event
				if ( win_w != win_w_new ) 
				{
					// timer shennanigans
					clearTimeout(timeout);
					timeout = setTimeout( function(){
						this._resize();
					}, 200 );
					
					// Update the width
					win_w = win_w_new;
				}
			};
			
			Stick.prototype.resize = function()
			{
				var target_offset = this.target.offset(),
					side = this.side,
					height = $win.height();
				
				this.target_top = target_offset.top;
				this.target_left = target_offset.left;
				this.target_right = $win.width() - ( this.target_left + this.target.width() );
				this.target_bottom = this.target_top + this.target.height();

				if ( ( side == 'top' &&
					   height < this.target_bottom ) ||
					 ( side == 'bottom' &&
					   height > this.target_top ) )
				{
					this.disabled = TRUE;
					if ( this.state === FIXED )
					{
						return this.position();
					}
				}
				else
				{
					this.disabled = FALSE;
					return this.scroll();
				}
			};

			Stick.prototype.scroll = function()
			{
				
				if ( this.disabled )
				{
					return;
				}
				
				var TARGET = 'target_',
					move = FALSE,
					side = this.side,
					target_offset = this[TARGET + side],
					original_offset = this.original_offsets[side],
					offset = this.offset,
					body = $body.get(0),
					scroll_top = $win.scrollTop() || 0,
					scroll_left = $win.scrollLeft() || 0,
					true_width = body.scrollWidth,
					true_height = body.scrollHeight;
				
				switch ( side )
				{
					// top
					case SIDES[0]:

						if ( target_offset - scroll_top - offset <= 0 )
						{
							move = TRUE;
							this.total_offset = scroll_top - ( target_offset + offset + original_offset );
						}
						break;

					// right
					case SIDES[1]:
					
						if ( target_offset - ( true_width - $win.width() - scroll_left ) - offset <= 0 )
						{
							move = TRUE;
							this.total_offset = true_width - ( target_offset + offset + original_offset );
						}
						break;

					// bottom
					case SIDES[2]:
						
						if ( $win.height() + scroll_top > true_height - ( target_offset - offset ) )
						{
							move = TRUE;
							this.total_offset = true_height - ( target_offset + offset + original_offset );
						}
						break;
					
					// left
					case SIDES[3]:
						
						if ( target_offset - scroll_left - offset <= 0 )
						{
							move = TRUE;
							this.total_offset = scroll_left - ( target_offset + offset + original_offset );
						}
						break;
				}
				
				if ( move )
				{
					if ( this.state === STATIC )
					{
						this.onStick();
					}
					this.state = FIXED;
				}
				else
				{
					if ( this.state === FIXED )
					{
						this.onUnstick();
					}
					this.state = STATIC;
				}
				
				return this.position();
			};

			return Stick;

		})();
	
	$.fn.stick = function( args )
	{
		if ( this.length )
		{
			return new Stick( this, args );
		}
	};
	
})( jQuery, window, document );